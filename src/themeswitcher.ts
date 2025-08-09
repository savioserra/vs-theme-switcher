import * as vscode from 'vscode';
import type { Subscription } from 'rxjs';

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
          const selection = await vscode.window.showInformationMessage(
            `Theme Switcher: ${event.name}`,
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
}

export function deactivate() {
  scheduler.stop();
}

function openSettingsWebview(_context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'themeSwitcherSettings',
    'Theme Switcher Settings',
    { viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
    { enableScripts: true, retainContextWhenHidden: true },
  );

  const webview = panel.webview;
  const nonce = getNonce();
  panel.webview.html = getWebviewHtml(webview, nonce);

  const postInit = () => {
    const mappings = config.getMappings();
    const themes = config.getAllColorThemes();
    const iconThemes = config.getAllIconThemes();
    webview.postMessage({ type: 'init', mappings, themes, iconThemes });
  };

  webview.onDidReceiveMessage(async (message) => {
    switch (message?.type) {
      case 'ready':
      case 'requestInit':
        postInit();
        return;
      case 'saveMappings': {
        await vscode.workspace
          .getConfiguration(config.SESSION_NAME)
          .update(
            'mappings',
            Array.isArray(message.mappings) ? message.mappings : [],
            vscode.ConfigurationTarget.Global,
          );
        vscode.window.showInformationMessage('Theme Switcher: Settings saved');
        return;
      }
      default:
        return;
    }
  });
}

function getWebviewHtml(webview: vscode.Webview, nonce: string) {
  const csp = [
    "default-src 'none';",
    `img-src ${webview.cspSource} https: data:;`,
    "style-src 'unsafe-inline';",
    `script-src 'nonce-${nonce}';`,
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
        body { background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif); }
        .container { padding: 12px; font-size: 13px; }
        .row { display: grid; grid-template-columns: 1fr 1.5fr 1.5fr auto; gap: 8px; align-items: center; padding: 6px 4px; }
        .header { font-weight: 600; color: var(--vscode-descriptionForeground); padding: 4px; }
        .border { border: 1px solid rgba(127,127,127,.25); border-radius: 6px; }
        .actions { margin-top: 12px; display: flex; gap: 8px; }
        .btn { padding: 6px 10px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
        .btn-secondary { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
        .btn-danger { color: var(--vscode-errorForeground); background: transparent; }
        input, select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 6px 8px; }
        input[disabled], select[disabled], button[disabled] { opacity: .6; cursor: not-allowed; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="margin-bottom:8px;">
          <div style="font-size:32px;font-weight:600;">Theme Switcher Settings</div>
          <div style="font-size:16px;color:var(--vscode-descriptionForeground);margin-top:8px">Configure when to apply each theme and optional icon theme.</div>
        </div>

        <div class="border" style="margin-top:12px;padding: 12px;">
          <div class="row header">
            <div>Time</div>
            <div>Theme</div>
            <div>Icon Theme (optional)</div>
            <div></div>
          </div>
          <div id="rows"></div>
        </div>

        <div class="actions">
          <button class="btn btn-primary" id="saveBtn" disabled>Save</button>
          <button class="btn btn-secondary" id="addBtn">+ Add</button>
        </div>
      </div>

      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let state = { themes: [], iconThemes: [], mappings: [], dirty: false };

        function setDirty(d) {
          state.dirty = d;
          document.getElementById('saveBtn').disabled = !d;
        }

        function updateMapping(idx, patch) {
          state.mappings[idx] = { ...state.mappings[idx], ...patch };
          setDirty(true);
        }

        function removeMapping(idx) {
          state.mappings.splice(idx, 1);
          renderRows();
          setDirty(true);
        }

        function addMapping() {
          state.mappings.push({ time: '09:00', theme: '', iconTheme: '' });
          renderRows();
          setDirty(true);
        }

        function renderRows() {
          const root = document.getElementById('rows');
          root.innerHTML = '';
          state.mappings.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = 'row';

            const time = document.createElement('input');
            time.type = 'time';
            time.step = 60;
            time.value = m.time || '';
            time.addEventListener('input', (e) => updateMapping(idx, { time: e.target.value || '' }));

            const theme = document.createElement('select');
            const opt0 = document.createElement('option'); opt0.value=''; opt0.textContent='Select a theme'; theme.appendChild(opt0);
            state.themes.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.label; theme.appendChild(o); });
            theme.value = m.theme?.id || '';
            theme.addEventListener('input', (e) => updateMapping(idx, { theme: e.target.value || '' }));

            const icon = document.createElement('select');
            const io0 = document.createElement('option'); io0.value=''; io0.textContent='None'; icon.appendChild(io0);
            state.iconThemes.forEach(t => { const o=document.createElement('option'); o.value=t.id; o.textContent=t.label; icon.appendChild(o); });
            icon.value = m.iconTheme || '';
            icon.addEventListener('input', (e) => updateMapping(idx, { iconTheme: e.target.value || '' }));

            const del = document.createElement('button');
            del.className = 'btn btn-danger';
            del.textContent = 'Remove';
            del.title = 'Remove';
            del.addEventListener('click', () => removeMapping(idx));

            row.appendChild(time);
            row.appendChild(theme);
            row.appendChild(icon);
            row.appendChild(del);
            root.appendChild(row);
          });
        }

        document.getElementById('saveBtn').addEventListener('click', () => {
          const mappings = state.mappings.map(m => ({ time: m.time, theme: m.theme, ...(m.iconTheme ? { iconTheme: m.iconTheme } : {}) }));
          vscode.postMessage({ type: 'saveMappings', mappings });
          setDirty(false);
        });

        document.getElementById('addBtn').addEventListener('click', addMapping);

        window.addEventListener('message', (event) => {
          const msg = event.data;
          if (!msg || typeof msg !== 'object') return;
          if (msg.type === 'init') {
            state.themes = Array.isArray(msg.themes) ? msg.themes : [];
            state.iconThemes = Array.isArray(msg.iconThemes) ? msg.iconThemes : [];
            state.mappings = Array.isArray(msg.mappings) ? msg.mappings.map(m => ({...m})) : [];
            setDirty(false);
            renderRows();
          }
        });

        vscode.postMessage({ type: 'ready' });
      </script>
      </body>
    </html>
`;
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
