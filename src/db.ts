import Dexie, { type Table } from 'dexie';
import type { FoodItem, LogEntry } from './models';

class FoodLogDB extends Dexie {
  foodItems!: Table<FoodItem, number>;
  logEntries!: Table<LogEntry, number>;

  constructor() {
    super('FoodLogDB');
    this.version(1).stores({
      foodItems: '++id, name, createdAt',
      logEntries: '++id, foodItemId, dayKey, timestamp',
    });
  }
}

export const db = new FoodLogDB();
