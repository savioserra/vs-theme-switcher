import * as code from "vscode";
import * as moment from "moment";

export interface MappingData {
  theme: string;
  time: string;
  timezone: string;
}

export default class ConfigurationManager {
  static getMappings() {
    return code.workspace
      .getConfiguration("themeswitcher")
      .get<MappingData[]>("mappings");
  }

  /**
   * Sets the global workbench colorTheme setting
   * @param theme To be switched to
   */
  static async switchTheme(theme: string): Promise<void> {
    const config = code.workspace.getConfiguration("workbench");

    if (config.get("colorTheme") !== theme) {
      await config.update("colorTheme", theme, code.ConfigurationTarget.Global);
    }
  }

  static MAPPINGS_CONFIGURATION = "themeswitcher.mappings";
}
