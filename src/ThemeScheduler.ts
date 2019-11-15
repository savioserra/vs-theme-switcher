import * as moment from "moment";

import { ConfigurationTarget, workspace } from "vscode";
import ConfigurationManager, { MappingData } from "./ConfigurationManager";
import { maxBy } from "lodash";

export default class ThemeScheduler {
  private static dayMs = 8.64e7;
  private pendingTasks: NodeJS.Timeout[] = [];

  /**
   * Cancel all pending timeouts callbacks
   */
  clear(): void {
    console.info("Clearing previous scheduled themes");

    this.pendingTasks.forEach(clearTimeout);
    this.pendingTasks = [];
  }

  /**
   * Schedules a new switch theme task
   */
  schedule(mapping: MappingData, milliseconds: number): void {
    const task: NodeJS.Timeout = setTimeout(
      () => this.execScheduled(mapping, task),
      milliseconds
    );

    this.pendingTasks.push(task);
  }

  scheduleAll(mappings: MappingData[]) {
    this.clear();

    const millisecondsMap = mappings.map(mapping => {
      const ms = this.getTimeMillisecondsOffset(mapping.timezone, mapping.time);
      return { ms, mapping };
    });

    const toBeSchedule = millisecondsMap.filter(({ ms }) => ms > 0);
    const pastSchedules = millisecondsMap.filter(({ ms }) => ms <= 0);

    const lastScheduledMapping = !pastSchedules.length
      ? Object.assign({}, maxBy(toBeSchedule, "ms"), { ms: 0 })
      : pastSchedules.reduce(
          (prev, curr) => (prev.ms > curr.ms ? prev : curr),
          pastSchedules[0]
        );

    const tomorrowSchedules = pastSchedules
      .filter(
        ({ ms, mapping: { theme } }) =>
          ms !== lastScheduledMapping.ms &&
          theme !== lastScheduledMapping.mapping.theme
      )
      .map(({ mapping }) => ({
        ms: this.getTimeMillisecondsOffset(mapping.timezone, mapping.time, 1),
        mapping
      }));

    const todaySchedules = [lastScheduledMapping, ...toBeSchedule];

    todaySchedules.forEach(({ mapping, ms }) => this.schedule(mapping, ms));
    tomorrowSchedules.forEach(({ mapping, ms }) => this.schedule(mapping, ms));

    console.info(`${this.pendingTasks.length} scheduled themes.`);
  }

  /**
   * Execute a switch theme task and schedules a new task
   * @param theme To be switched to
   * @param originTask Task which originated this task
   */
  private async execScheduled(
    { theme, timezone, time }: MappingData,
    originTask: NodeJS.Timeout
  ): Promise<void> {
    await ConfigurationManager.switchTheme(theme);
    this.pendingTasks = this.pendingTasks.filter(t => t !== originTask);

    this.schedule({ theme, timezone, time }, ThemeScheduler.dayMs);
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
  ): number {
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
