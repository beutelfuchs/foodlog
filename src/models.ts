export interface FoodItem {
  id?: number;
  name: string;
  kcal: number;
  image?: Blob;
  createdAt: number;
}

export interface LogEntry {
  id?: number;
  foodItemId: number;
  kcal: number;
  timestamp: number;
  dayKey: string;
}
