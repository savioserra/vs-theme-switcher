import * as vscode from 'vscode';

export interface Configuration {
  time: string;
  theme: string;
  iconTheme?: string;
}

export const SESSION_NAME = 'themeswitcher';

export function getMappings() {
  return vscode.workspace
    .getConfiguration(SESSION_NAME)
    .get<Configuration[]>('mappings', []);
}

export async function applyTheme(themeId: string) {
  return vscode.workspace
    .getConfiguration('workbench')
    .update('colorTheme', themeId, vscode.ConfigurationTarget.Global);
}

export async function applyIconTheme(iconThemeId: string) {
  return vscode.workspace
    .getConfiguration('workbench')
    .update('iconTheme', iconThemeId, vscode.ConfigurationTarget.Global);
}

export function getCurrentTheme() {
  const cfg = vscode.workspace.getConfiguration('workbench');

  return {
    theme: cfg.get<string>('colorTheme'),
    iconTheme: cfg.get<string>('iconTheme'),
  };
}

export function getUtcOffset() {
  return vscode.workspace
    .getConfiguration(SESSION_NAME)
    .get<number>('utcOffset');
}

export function getAllColorThemes() {
  return vscode.extensions.all
    .flatMap((ext) => ext.packageJSON?.contributes?.themes ?? [])
    .map((theme) => ({ label: theme.label as string, id: theme.id as string }));
}

export function getAllIconThemes() {
  return vscode.extensions.all
    .flatMap((ext) => ext.packageJSON?.contributes?.iconThemes ?? [])
    .map((theme) => ({ label: theme.label as string, id: theme.id as string }));
}
