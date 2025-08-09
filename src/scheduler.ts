import { Moment } from 'moment';
import * as moment from 'moment';

import * as config from './config';
import { Subject, Observable, timer, Subscription } from 'rxjs';

export type SchedulerEvent =
  | { type: 'theme_registered'; themes: config.Configuration[] }
  | { type: 'theme_applied'; name: string }
  | { type: 'icon_theme_applied'; name: string }
  | { type: 'theme_unregistered'; name: string }
  | { type: 'cleared' };

interface RegisteredTheme {
  when: Moment;
  theme?: { label: string; id: string };
  iconTheme?: { label: string; id: string };
}

export default class Scheduler {
  private timerSubscription?: Subscription;
  // Registered themes in descending order
  private registered: RegisteredTheme[] = [];
  private readonly eventsSubject = new Subject<SchedulerEvent>();

  public readonly events$: Observable<SchedulerEvent> =
    this.eventsSubject.asObservable();

  public start() {
    if (this.timerSubscription) {
      return;
    }

    this.timerSubscription = timer(0, 5000).subscribe(async () => {
      const now = moment();

      const target = this.registered
        .map(({ when, ...it }) => ({ ...it, when: ensureSameDay(when, now) }))
        .find(({ when }) => now.isSameOrAfter(when, 'minute'));

      const currentTheme = config.getCurrentTheme();

      if (target?.iconTheme && target.iconTheme.id !== currentTheme.iconTheme) {
        await config.applyIconTheme(target.iconTheme.id);

        this.eventsSubject.next({
          type: 'icon_theme_applied',
          name: target.iconTheme.label,
        });
      }

      if (target?.theme?.id && target.theme.id !== currentTheme.theme) {
        await config.applyTheme(target.theme.id);

        this.eventsSubject.next({
          type: 'theme_applied',
          name: target.theme.label,
        });
      }
    });
  }

  public stop() {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = undefined;
  }

  public register(...themes: config.Configuration[]): void {
    const availableThemes = config.getAllColorThemes();
    const availableIconThemes = config.getAllIconThemes();

    const values: RegisteredTheme[] = [];

    for (const { time, theme, iconTheme } of themes) {
      const date = moment(time, 'HH:mm');

      if (!date.isValid()) {
        this.eventsSubject.error(
          new Error(`Invalid time format ${time} for ${theme}`),
        );

        continue;
      }

      const t = availableThemes.find((t) => t.id === theme);
      const i = availableIconThemes.find((t) => t.id === iconTheme);

      values.push({ theme: t, iconTheme: i, when: date });
    }

    this.registered = [...this.registered, ...values].sort((a, b) =>
      b.when.diff(a.when),
    );

    this.eventsSubject.next({ type: 'theme_registered', themes });
  }

  public unregisterAll(): void {
    this.registered = [];
    this.eventsSubject.next({ type: 'cleared' });
  }
}

function ensureSameDay(date: Moment, reference: Moment): Moment {
  return date
    .clone()
    .year(reference.year())
    .month(reference.month())
    .date(reference.date());
}
