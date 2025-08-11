import * as assert from 'assert';
import { beforeEach } from 'mocha';
import * as vscode from 'vscode';
import { getAllColorThemes } from '../../config';

const scope = vscode.ConfigurationTarget.Global;

async function waitFor<T>(
  predicate: () => Promise<T> | T,
  timeoutMs = 10000,
  intervalMs = 200,
): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await predicate();
    if (result) {
      return result;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('Timeout while waiting for condition');
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

suite('Theme Switcher', () => {
  beforeEach(async () => {
    await vscode.workspace
      .getConfiguration('themeswitcher')
      .update('mappings', [], scope);

    await vscode.workspace
      .getConfiguration('workbench')
      .update('colorTheme', 'Default Light+', scope);

    const ext = vscode.extensions.getExtension('savioserra.theme-switcher');

    assert.ok(ext, 'Extension not found by id');

    if (!ext!.isActive) {
      await ext!.activate();
    }
  });

  test('Command is registered', async () => {
    const commands = await vscode.commands.getCommands(true);

    assert.ok(
      commands.includes('themeswitcher.openSettings'),
      'themeswitcher.openSettings command is not registered',
    );
  });

  test('Open Settings webview shows a tab', async () => {
    // Execute command to open the settings webview
    await vscode.commands.executeCommand('themeswitcher.openSettings');

    // Wait for the tab to appear with the expected title
    const tab = await waitFor(
      () => {
        for (const group of vscode.window.tabGroups.all) {
          const found = group.tabs.find(
            (t) => t.label === 'Theme Switcher Settings',
          );

          if (found) {
            return found;
          }
        }

        return undefined;
      },
      15000,
      250,
    );

    assert.ok(tab, 'Settings webview tab not found');

    // Optionally close the tab to keep the environment clean
    try {
      await vscode.window.tabGroups.close(tab!, true);
    } catch {
      // ignore if it cannot close in this environment
    }
  });

  test('Updates theme when settings change', async () => {
    const current = vscode.workspace
      .getConfiguration('workbench')
      .get<string>('colorTheme');

    const target = getAllColorThemes().find((t) => t.id !== current);

    if (!target) {
      throw new Error('No themes available');
    }

    const theme = target.id ?? target.label;

    // Set mapping to apply the chosen theme
    await vscode.workspace
      .getConfiguration('themeswitcher')
      .update('mappings', [{ time: '09:00', theme }], scope);

    assert.ok(
      await waitFor(
        async () => {
          const expected = vscode.workspace
            .getConfiguration('workbench')
            .get<string>('colorTheme');

          return expected === theme;
        },
        30000,
        1000,
      ),
      'Theme did not change to the expected value',
    );
  });
});
