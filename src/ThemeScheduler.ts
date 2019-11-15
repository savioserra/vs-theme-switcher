import * as moment from "moment";

import { ConfigurationTarget, workspace } from "vscode";
import { MappingData } from "./ConfigurationManager";

export default class ThemeScheduler {
  private pendingTasks: NodeJS.Timeout[] = [];

  /**
   * Cancel all pending timeouts callbacks
   */
  clear() {
    console.info("Clearing previous scheduled themes");

    this.pendingTasks.forEach(clearTimeout);
  }

  /**
   * Schedules a new switch theme task
   */
  schedule({ theme, timezone, time }: MappingData, daysOffset = 0) {
    const remainingMilliseconds = this.getTimeMillisecondsOffset(
      timezone,
      time,
      daysOffset
    );

    if (remainingMilliseconds < 0) {
      this.schedule({ theme, timezone, time }, 1);
    } else {
      const task: NodeJS.Timeout = setTimeout(
        () => this.execScheduled({ theme, time, timezone }, task),
        remainingMilliseconds
      );

      this.pendingTasks.push(task);
    }
  }

  /**
   * Execute a switch theme task and schedules a new task
   * @param theme To be switched to
   * @param originTask Task which originated this task
   */
  private async execScheduled(
    { theme, timezone, time }: MappingData,
    originTask: NodeJS.Timeout
  ) {
    await this.switchTheme(theme);
    this.pendingTasks = this.pendingTasks.filter(t => t !== originTask);

    this.schedule({ theme, timezone, time }, 1);
  }

  /**
   * Sets the global workbench colorTheme setting
   * @param theme To be switched to
   */
  private async switchTheme(theme: string) {
    workspace
      .getConfiguration("workbench")
      .update("colorTheme", theme, ConfigurationTarget.Global);
  }

  /**
   * Returns the difference in milliseconds from the time given and the current time.
   * @param timezone Timezone
   * @param time Time string. Format: 23:59 (HH:MM)
   * @param daysOffset How many days should be added to time param
   */
  private getTimeMillisecondsOffset(
    timezone: string,
    time: string,
    daysOffset = 0
  ) {
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
      .add(daysOffset, "days");

    return toBeSchedule.diff(now, "milliseconds");
  }
}
