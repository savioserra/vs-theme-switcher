import * as vscode from 'vscode';
import * as path from 'path';

import * as config from './config';
import Scheduler, { type SchedulerEvent } from './scheduler';

export type { SchedulerEvent };

const scheduler = new Scheduler();
// Expose the event stream so plugins can subscribe
export const events$ = scheduler.events$;

function registerAll() {
  const themes = config.getMappings() ?? [];
  scheduler.register(...themes);
}

export async function activate(context: vscode.ExtensionContext) {
  const subscription = events$.subscribe({
    next: async (event) => {
      switch (event.type) {
        case 'theme_applied':
        case 'icon_theme_applied': {
          const msg = {
            theme_applied: 'Theme applied',
            icon_theme_applied: 'Icon theme applied',
          };

          const selection = await vscode.window.showInformationMessage(
            `${msg[event.type]}: ${event.name}`,
            { title: 'Settings', action: 'openSettings' },
          );

          if (selection?.action === 'openSettings') {
            vscode.commands.executeCommand('themeswitcher.openSettings');
          }

          return;
        }

        case 'theme_registered':
        case 'theme_unregistered':
        default:
          console.log(`[ThemeSwitcher] Event Type: ${event.type}`);
          return;
      }
    },
    error: (error) => {
      vscode.window.showErrorMessage(
        `[ThemeSwitcher] Error occurred: ${error}`,
      );
    },
  });

  context.subscriptions.push({
    dispose: () => subscription.unsubscribe(),
  });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(config.SESSION_NAME)) {
        scheduler.stop();
        scheduler.unregisterAll();

        registerAll();
        scheduler.start();
      }
    }),
  );

  // Register Settings Webview command
  context.subscriptions.push(
    vscode.commands.registerCommand('themeswitcher.openSettings', () =>
      openSettingsWebview(context),
    ),
  );

  registerAll();
  scheduler.start();

  // Show welcome page on first install
  await showWelcomeIfFirstInstall(context);
}

export function deactivate() {
  scheduler.stop();
}

async function showWelcomeIfFirstInstall(context: vscode.ExtensionContext) {
  try {
    const VERSION_KEY = 'themeswitcher.installedVersion';
    const previousVersion = context.globalState.get<string>(VERSION_KEY);

    const ext = vscode.extensions.getExtension('savioserra.theme-switcher');
    const currentVersion =
      (ext?.packageJSON?.version as string | undefined) ?? 'unknown';

    // Always update stored version and
    // determine first install by absence of previous value
    await context.globalState.update(VERSION_KEY, currentVersion);

    const isTestEnv =
      context.extensionMode === vscode.ExtensionMode.Test ||
      process.env['VSCODE_TEST'];

    if (!previousVersion || isTestEnv) {
      const readmePath = path.join(context.extensionPath, 'README.md');
      const uri = vscode.Uri.file(readmePath);

      try {
        await vscode.commands.executeCommand('markdown.showPreview', uri);
      } catch {
        await vscode.commands.executeCommand('vscode.open', uri);
      }
    }
  } catch (err) {
    console.warn('[ThemeSwitcher] Failed to show welcome page:', err);
  }
}

function openSettingsWebview(_context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'themeSwitcherSettings',
    'Theme Switcher Settings',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(_context.extensionPath, 'dist', 'webview')),
      ],
    },
  );

  // Use the same icon as the extension for the Settings page tab
  try {
    const icon = vscode.Uri.file(
      path.join(_context.extensionPath, 'assets', 'icon128.png'),
    );

    panel.iconPath = { light: icon, dark: icon };
  } catch (err) {
    console.warn('[ThemeSwitcher] Failed to set settings icon:', err);
  }

  const nonce = getNonce();
  const webview = panel.webview;

  const scriptPathOnDisk = vscode.Uri.file(
    path.join(_context.extensionPath, 'dist', 'webview', 'settings.js'),
  );

  const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
  panel.webview.html = getWebviewHtml(webview, nonce, scriptUri);

  // Dev-only hot reload: watch webview bundle and reload on changes
  if (_context.extensionMode === vscode.ExtensionMode.Development) {
    try {
      const pattern = new vscode.RelativePattern(
        _context.extensionUri,
        'dist/webview/**/*',
      );

      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      let reloadTimer: NodeJS.Timeout | undefined;

      const triggerReload = () => {
        if (reloadTimer) {
          clearTimeout(reloadTimer);
        }

        reloadTimer = setTimeout(() => {
          const newNonce = getNonce();
          const bustedScriptUri = scriptUri.with({ query: `v=${Date.now()}` });

          panel.webview.html = getWebviewHtml(
            webview,
            newNonce,
            bustedScriptUri,
          );

          void webview.postMessage({
            type: 'init-form',
            themes: config.getAllColorThemes(),
            iconThemes: config.getAllIconThemes(),
          });

          void webview.postMessage({
            type: 'changed',
            state: config.getMappings(),
          });
        }, 100);
      };

      const disposable = watcher.onDidChange(triggerReload);

      panel.onDidDispose(() => {
        watcher.dispose();
        disposable.dispose();

        if (reloadTimer) {
          clearTimeout(reloadTimer);
        }
      });
    } catch (err) {
      console.warn('[ThemeSwitcher] Failed to setup dev hot reload:', err);
    }
  }

  const subscription = events$.subscribe((event) => {
    switch (event.type) {
      case 'init':
      case 'cleared':
      case 'theme_registered':
      case 'theme_unregistered': {
        const state = config.getMappings();
        webview.postMessage({ type: 'changed', state });
        break;
      }

      default:
        return;
    }
  });

  panel.onDidDispose(() => subscription.unsubscribe());

  webview.onDidReceiveMessage(async (message) => {
    switch (message?.type) {
      case 'save': {
        await config.save(message as config.Settings);
        vscode.window.showInformationMessage('Theme Switcher: Settings saved');
        return;
      }

      default:
        return;
    }
  });

  void webview.postMessage({
    type: 'init-form',
    themes: config.getAllColorThemes(),
    iconThemes: config.getAllIconThemes(),
  });

  void webview.postMessage({
    type: 'changed',
    state: config.getMappings(),
  });
}

function getWebviewHtml(
  webview: vscode.Webview,
  nonce: string,
  scriptUri: vscode.Uri,
) {
  const csp = [
    "default-src 'none';",
    "style-src 'unsafe-inline';",
    `img-src ${webview.cspSource} https: data:;`,
    `script-src 'nonce-${nonce}' ${webview.cspSource};`,
  ].join(' ');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" content="${csp}">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Theme Switcher Settings</title>
      <style>
        :root { color-scheme: light dark; }
        body { background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif); padding: 0px; }
        select, input { color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

function getNonce() {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}
