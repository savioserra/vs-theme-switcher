import * as vscode from 'vscode';

export interface Configuration {
  time: string;
  theme: string;
}

export const SESSION_NAME = 'themeswitcher';

export function getMappings() {
  return vscode.workspace
    .getConfiguration(SESSION_NAME)
    .get<Configuration[]>('mappings', []);
}

export async function applyTheme(theme: string) {
  return vscode.workspace
    .getConfiguration('workbench')
    .update('colorTheme', theme, vscode.ConfigurationTarget.Global);
}

export function getCurrentTheme() {
  return vscode.workspace
    .getConfiguration('workbench')
    .get<string>('colorTheme');
}

export function getUtcOffset() {
  return vscode.workspace
    .getConfiguration(SESSION_NAME)
    .get<number>('utcOffset');
}
