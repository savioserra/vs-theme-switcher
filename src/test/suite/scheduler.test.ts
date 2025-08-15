import * as assert from 'assert';
import * as moment from 'moment';
import Scheduler from '../../scheduler';
import * as config from '../../config';

suite('Scheduler (unit)', () => {
  let originalNow: (() => number) | undefined;
  let originalApplyTheme: any;
  let originalGetCurrentTheme: any;

  const setFixedNow = (iso: string) => {
    const fixed = new Date(iso).getTime();
    (moment as any).now = () => fixed;
  };

  const restoreNow = () => {
    if (originalNow) {
      (moment as any).now = originalNow;
    }
  };

  setup(() => {
    // save originals
    originalNow = (moment as any).now;
    originalApplyTheme = (config as any).applyTheme;
    originalGetCurrentTheme = (config as any).getCurrentTheme;
  });

  teardown(() => {
    // restore stubs
    (config as any).applyTheme = originalApplyTheme;
    (config as any).getCurrentTheme = originalGetCurrentTheme;
    restoreNow();
  });

  test('applies most recent mapping at or before now', async () => {
    // Fix time at 12:00 local on a stable date
    setFixedNow('2025-01-01T12:00:00');

    const applied: string[] = [];

    (config as any).applyTheme = async (id: string) => {
      applied.push(id);
    };

    (config as any).getCurrentTheme = () => ({
      theme: 'initial',
      iconTheme: undefined,
    });

    const scheduler = new Scheduler();

    // Two mappings: one in the future (13:00) and one in the past (11:00).
    // Expect the one at 11:00 to be applied.
    scheduler.register(
      {
        when: moment('13:00', 'HH:mm'),
        theme: { id: 'theme-future', label: 'Future' },
        iconTheme: undefined,
      },
      {
        when: moment('11:00', 'HH:mm'),
        theme: { id: 'theme-past', label: 'Past' },
        iconTheme: undefined,
      },
    );

    const result = await new Promise<string>((resolve, reject) => {
      const sub = scheduler.events$.subscribe({
        next: (ev) => {
          if (ev.type === 'theme_applied') {
            sub.unsubscribe();
            resolve(applied[applied.length - 1]);
          }
        },
        error: reject,
      });

      scheduler.start();

      // Safety timeout in case of failure
      setTimeout(() => {
        sub.unsubscribe();
        scheduler.stop();
        reject(new Error('Timeout waiting for theme_applied'));
      }, 3000);
    });

    scheduler.stop();

    assert.strictEqual(
      result,
      'theme-past',
      'Should apply the most recent mapping before now (11:00)',
    );
  });

  test('wraps to last mapping when before earliest time (circular list)', async () => {
    // Fix time at 12:00 local on a stable date
    setFixedNow('2025-01-01T12:00:00');

    const applied: string[] = [];

    (config as any).applyTheme = async (id: string) => {
      applied.push(id);
    };

    (config as any).getCurrentTheme = () => ({
      theme: 'initial',
      iconTheme: undefined,
    });

    const scheduler = new Scheduler();

    // Two mappings both after 12:00: 13:00 and 14:00.
    // With circular fallback, it should pick the latest mapping (14:00).
    scheduler.register(
      {
        when: moment('13:00', 'HH:mm'),
        theme: { id: 'theme-1300', label: '1 PM' },
        iconTheme: undefined,
      },
      {
        when: moment('14:00', 'HH:mm'),
        theme: { id: 'theme-1400', label: '2 PM' },
        iconTheme: undefined,
      },
    );

    const result = await new Promise<string>((resolve, reject) => {
      const sub = scheduler.events$.subscribe({
        next: (ev) => {
          if (ev.type === 'theme_applied') {
            sub.unsubscribe();
            resolve(applied[applied.length - 1]);
          }
        },
        error: reject,
      });

      scheduler.start();

      // Safety timeout in case of failure
      setTimeout(() => {
        sub.unsubscribe();
        scheduler.stop();
        reject(new Error('Timeout waiting for theme_applied'));
      }, 3000);
    });

    scheduler.stop();

    assert.strictEqual(
      result,
      'theme-1400',
      'Should wrap to the last (latest) registered mapping when before earliest',
    );
  });
});
