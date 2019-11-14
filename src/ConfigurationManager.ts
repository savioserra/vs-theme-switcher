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
}
