import * as moment from "moment";

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

    const millisecondsMap = mappings.map((mapping) => {
      const ms = this.getTimeMillisecondsOffset(mapping.time);
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
        ms: this.getTimeMillisecondsOffset(mapping.time, 1),
        mapping,
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
    { iconTheme, theme, time }: MappingData,
    originTask: NodeJS.Timeout
  ): Promise<void> {
    if (iconTheme !== undefined) {
      await ConfigurationManager.switchIconTheme(iconTheme);
    }
    await ConfigurationManager.switchTheme(theme);
    this.pendingTasks = this.pendingTasks.filter((t) => t !== originTask);

    this.schedule({ iconTheme, theme, time }, ThemeScheduler.dayMs);
  }

  /**
   * Returns the difference in milliseconds from the time given and the current time.
   * @param timezone Timezone
   * @param time Time string. Format: 23:59 (HH:MM)
   * @param daysOffset How many days should be added to time param
   */
  private getTimeMillisecondsOffset(time: string, daysOffset = 0): number {
    const now = moment.utc();
    now.add(ConfigurationManager.utcOffset, "hours");

    const datetime = moment(time, "hh:mm:ss");

    const toBeSchedule = now
      .clone()
      .set({ h: datetime.hour(), m: datetime.minute(), s: datetime.second() })
      .add(daysOffset, "days");

    return toBeSchedule.diff(now, "milliseconds");
  }
}
