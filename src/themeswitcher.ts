import * as vscode from 'vscode';
import * as config from './config';
import Scheduler, { type SchedulerEvent } from './scheduler';
import type { Subscription } from 'rxjs';

export type { SchedulerEvent };

const scheduler = new Scheduler();
// Expose the event stream so plugins can subscribe
export const events$ = scheduler.events$;

let subscription: Subscription | undefined;

function registerAll() {
  const themes = config.getMappings() ?? [];
  scheduler.register(...themes);
}

export async function activate(_context: vscode.ExtensionContext) {
  registerAll();
  scheduler.start();

  subscription = events$.subscribe({
    next: (event) => {
      switch (event.type) {
        case 'theme_applied': {
          return vscode.window.showInformationMessage(
            `Theme Switcher: ${event.name}`,
          );
        }
        case 'theme_registered':
        case 'theme_scheduled':
        case 'theme_unregistered':
          // These event types are intentionally ignored
          return;
        default:
          // Unknown event type
          return;
      }
    },
    error: (error) => {
      vscode.window.showErrorMessage(
        `[ThemeSwitcher] Error occurred: ${error}`,
      );
    },
  });

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(config.SESSION_NAME)) {
      scheduler.stop();
      scheduler.unregisterAll();

      registerAll();
      scheduler.start();
    }
  });

  setInterval(refresh, 6e5); // Refresh in every ten minutes
}

export function deactivate() {
  scheduler.stop();
  subscription?.unsubscribe();
}
