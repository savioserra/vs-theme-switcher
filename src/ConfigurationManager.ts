import * as code from "vscode";

export interface MappingData {
  theme: string;
  time: string;
}

export default class ConfigurationManager {
  static get mappings() {
    return code.workspace
      .getConfiguration(ConfigurationManager.SESSION_NAME)
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

  /**
   * Gets the current utc offset setting
   */
  static get utcOffset(): number | undefined {
    const config = code.workspace.getConfiguration(
      ConfigurationManager.SESSION_NAME
    );

    return config.get<number>("utcOffset");
  }

  static SESSION_NAME = "themeswitcher";
  static MAPPINGS_SETTINGS = `${ConfigurationManager.SESSION_NAME}.mappings`;
  static UTCOFFSET_SETTING = `${ConfigurationManager.SESSION_NAME}.utcOffset`;
}
