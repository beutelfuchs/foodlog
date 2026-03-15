import Dexie, { type Table } from 'dexie';
import type { FoodItem, LogEntry, ExerciseEntry } from './models';

export interface Setting {
  key: string;
  value: string;
}

class FoodLogDB extends Dexie {
  foodItems!: Table<FoodItem, number>;
  logEntries!: Table<LogEntry, number>;
  exerciseEntries!: Table<ExerciseEntry, number>;
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
    this.version(3).stores({
      foodItems: '++id, name, createdAt',
      logEntries: '++id, foodItemId, dayKey, timestamp',
      exerciseEntries: '++id, dayKey, timestamp',
      settings: 'key',
    });
  }
}

export const db = new FoodLogDB();
