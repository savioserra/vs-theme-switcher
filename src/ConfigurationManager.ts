import moment = require("moment");
import * as code from "vscode";

export interface MappingData {
  theme: (string|{
    name:string;
    commands:string[][];
  })[];
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
  static async switchTheme(themeList:MappingData): Promise<void> {
    if(themeList.theme.length==0){
      return;
    }

    const config = code.workspace.getConfiguration("workbench");

    const randomTheme=themeList.theme[Math.floor(Math.random()*themeList.theme.length)];
    const theme=(typeof randomTheme==="string"? randomTheme:randomTheme.name);
    const commands=(typeof randomTheme==="string"? []:randomTheme.commands);

    const lastReload:any=this.context.globalState.get("lastReload")||0;
    let now=moment.utc();
    if(now.diff(lastReload,"second")<5){
      return;
    }
    
    if (config.get("colorTheme") !== theme||commands.length>0) {
      console.log("Switching themes to", theme,commands);
      for(const command of commands){
        if (command.length >= 1) {
          await code.commands.executeCommand(command[0], ...command.slice(1));
          console.log(command[0]);
        }
      };
      if(commands.length>0){
        setTimeout(async () => {
          now=moment.utc();
          await this.context.globalState.update("lastReload",now);
          code.commands.executeCommand("workbench.action.reloadWindow");
        }, 5000);
      }
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

  static context:code.ExtensionContext;
  static SESSION_NAME = "themeswitcher";
  static MAPPINGS_SETTINGS = `${ConfigurationManager.SESSION_NAME}.mappings`;
  static UTCOFFSET_SETTING = `${ConfigurationManager.SESSION_NAME}.utcOffset`;
}