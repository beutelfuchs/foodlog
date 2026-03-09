import { format, subDays, startOfDay } from 'date-fns';

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function dayKeyFor(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(dayKeyFor(subDays(new Date(), i)));
  }
  return days;
}

export function dayLabel(dayKey: string): string {
  return format(new Date(dayKey + 'T00:00:00'), 'EEE d');
}

export function timestampToday(): number {
  return startOfDay(new Date()).getTime();
}
