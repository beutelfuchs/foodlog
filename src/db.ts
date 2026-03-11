import Dexie, { type Table } from 'dexie';
import type { FoodItem, LogEntry } from './models';

export interface Setting {
  key: string;
  value: string;
}

class FoodLogDB extends Dexie {
  foodItems!: Table<FoodItem, number>;
  logEntries!: Table<LogEntry, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('FoodLogDB');
    this.version(1).stores({
      foodItems: '++id, name, createdAt',
      logEntries: '++id, foodItemId, dayKey, timestamp',
    });
    this.version(2).stores({
      foodItems: '++id, name, createdAt',
      logEntries: '++id, foodItemId, dayKey, timestamp',
      settings: 'key',
    });
  }
}

export const db = new FoodLogDB();
