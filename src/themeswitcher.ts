import * as code from "vscode";
import ConfigurationManager from "./ConfigurationManager";
import ThemeScheduler from "./ThemeScheduler";

const scheduler = new ThemeScheduler();

export async function activate(context: code.ExtensionContext) {
  setup();

  code.workspace.onDidChangeConfiguration(setup);
}

function setup() {
  scheduler.clear();

  const mappings = ConfigurationManager.getMappings();

  if (mappings) {
    mappings.forEach(m => scheduler.schedule(m));
  }
}

export function deactivate() {
  scheduler.clear();
}
