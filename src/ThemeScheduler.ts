import * as code from "vscode";
import * as moment from "moment";

import { MappingData } from "./ConfigurationManager";

export default class ThemeScheduler {
  private timeouts: NodeJS.Timeout[] = [];

  clear() {
    console.info("Clearing previous scheduled themes");
    this.timeouts.forEach(clearTimeout);
  }

  schedule({ theme, timezone, time }: MappingData, offsetInDays = 0) {
    const now = moment();

    if (timezone === "America/Sao_Paulo" && now.isDST()) {
      // Just until moment updates daylight saving rules for Brazil
      // https://github.com/moment/moment-timezone/issues/785

      now.subtract(1, "hour");
    }

    const datetime = moment(time, "hh:mm:ss");
    const toBeSchedule = moment(now)
      .set({
        hour: datetime.hour(),
        minute: datetime.minute(),
        second: datetime.second()
      })
      .add(offsetInDays, "days");

    const remainingMilliseconds = toBeSchedule.diff(now, "milliseconds");

    if (remainingMilliseconds < 0) {
      this.schedule({ theme, timezone, time }, 1);
    } else {
      this.timeouts.push(
        setTimeout(async () => {
          await code.workspace
            .getConfiguration("workbench")
            .update("colorTheme", theme, code.ConfigurationTarget.Global);

          this.schedule({ theme, timezone, time }, 1);
        }, remainingMilliseconds)
      );
    }
  }
}
