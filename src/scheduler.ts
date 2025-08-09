import { Moment } from 'moment';
import * as moment from 'moment';

import * as config from './config';
import { Subject, Observable, timer, Subscription } from 'rxjs';

export type SchedulerEvent =
  | { type: 'theme_registered'; name: string; when: string }
  | { type: 'theme_scheduled'; name: string; when: string }
  | { type: 'theme_applied'; name: string }
  | { type: 'theme_unregistered'; name: string }
  | { type: 'cleared' };

interface RegisteredTheme {
  when: Moment;
  theme: string;
  iconTheme?: string;
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

      if (target && target.theme !== currentTheme) {
        await config.applyTheme(target.theme);

        if (target.iconTheme) {
          await config.applyIconTheme(target.iconTheme);
        }

        this.eventsSubject.next({ type: 'theme_applied', name: target.theme });
      }
    });
  }

  public stop() {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = undefined;
  }

  public register(...themes: config.Configuration[]): void {
    const values: typeof this.registered = [];

    for (const { time, theme } of themes) {
      const date = moment(time, 'HH:mm');

      if (!date.isValid()) {
        this.eventsSubject.error(
          new Error(`Invalid time format ${time} for ${theme}`),
        );

        continue;
      }

      values.push({ theme, when: date });
    }

    this.registered = [...this.registered, ...values].sort((a, b) => {
      return b.when.diff(a.when);
    });

    values.forEach(({ theme, when }) => {
      this.eventsSubject.next({
        name: theme,
        type: 'theme_registered',
        when: when.format('HH:mm'),
      });
    });
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
