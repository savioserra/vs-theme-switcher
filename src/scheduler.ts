import { Moment } from 'moment';
import * as moment from 'moment';

import * as config from './config';
import { Subject, Observable, timer, Subscription } from 'rxjs';
import { ensureSameDay } from './utils';

export type SchedulerEvent =
  | { type: 'init' }
  | { type: 'cleared' }
  | { type: 'theme_applied'; name: string }
  | { type: 'icon_theme_applied'; name: string }
  | { type: 'theme_unregistered'; name: string }
  | { type: 'theme_registered'; name: string };

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

  public register(...themes: config.ValidatedMapping[]): void {
    this.registered = [...this.registered, ...themes].sort((a, b) => {
      return b.when.diff(a.when);
    });

    themes
      .map((t) => t.theme?.label)
      .filter((t): t is string => !!t)
      .forEach((label) => {
        this.eventsSubject.next({
          name: label,
          type: 'theme_registered',
        });
      });
  }

  public unregisterAll(): void {
    this.registered = [];
    this.eventsSubject.next({ type: 'cleared' });
  }
}
