import type { Moment } from 'moment/moment';

export function ensureSameDay(date: Moment, reference: Moment): Moment {
  return date
    .clone()
    .year(reference.year())
    .month(reference.month())
    .date(reference.date());
}
