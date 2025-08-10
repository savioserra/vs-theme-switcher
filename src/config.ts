import * as moment from 'moment';
import * as vscode from 'vscode';

export interface Configuration {
  time: string;
  theme: string;
  iconTheme?: string;
}

export interface Settings {
  // @deprecated
  utcOffset: number;
  mappings: Configuration[];
}

export interface ValidatedMapping {
  when: moment.Moment;
  theme: { label: string; id: string } | undefined;
  iconTheme: { label: string; id: string } | undefined;
}

export const SESSION_NAME = 'themeswitcher';

export function getMappings() {
  const mappings = vscode.workspace
    .getConfiguration(SESSION_NAME)
    .get<Configuration[]>('mappings', []);

  if (!mappings?.length) {
    return [];
  }

  const values: Array<ValidatedMapping> = [];
  const availableThemes = getAllColorThemes();
  const availableIconThemes = getAllIconThemes();

  for (const { time, theme, iconTheme } of mappings) {
    const date = moment(time, 'HH:mm');

    if (!date.isValid()) {
      continue;
    }

    values.push({
      when: date,
      theme: availableThemes.find((t) => t.id === theme),
      iconTheme: availableIconThemes.find((t) => t.id === iconTheme),
    });
  }

  return values.sort((a, b) => b.when.diff(a.when));
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
export async function save({ mappings }: Settings) {
  await vscode.workspace
    .getConfiguration(SESSION_NAME)
    .update('mappings', mappings, vscode.ConfigurationTarget.Global);
}
