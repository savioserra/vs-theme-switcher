import * as code from "vscode";
import ConfigurationManager from "./ConfigurationManager";
import ThemeScheduler from "./ThemeScheduler";

const scheduler = new ThemeScheduler();

export async function activate(context: code.ExtensionContext) {
  refresh();

  code.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
    if (affectsConfiguration(ConfigurationManager.SESSION_NAME)) {
      refresh();
    }
  });

  setInterval(refresh, 6e5); // Refresh in every ten minutes
}

function refresh() {
  const mappings = ConfigurationManager.mappings;

  if (mappings) {
    scheduler.scheduleAll(mappings);
  }
}

export function deactivate() {
  scheduler.clear();
}
