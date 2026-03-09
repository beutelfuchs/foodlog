import { db } from '../db';
import type { FoodItem, LogEntry } from '../models';

interface ExportData {
  version: 1;
  exportedAt: string;
  foodItems: (Omit<FoodItem, 'image'> & { image?: string })[];
  logEntries: LogEntry[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export async function exportData(): Promise<void> {
  const foodItems = await db.foodItems.toArray();
  const logEntries = await db.logEntries.toArray();

  const serializedFoods = await Promise.all(
    foodItems.map(async (item) => {
      const { image, ...rest } = item;
      return {
        ...rest,
        image: image ? await blobToBase64(image) : undefined,
      };
    })
  );

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    foodItems: serializedFoods,
    logEntries,
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `foodlog-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<{ foods: number; entries: number }> {
  const text = await file.text();
  const data: ExportData = JSON.parse(text);

  if (data.version !== 1) throw new Error('Unsupported export version');

  // Clear existing data
  await db.transaction('rw', db.foodItems, db.logEntries, async () => {
    await db.foodItems.clear();
    await db.logEntries.clear();

    // Import food items, mapping old IDs to new IDs
    const idMap = new Map<number, number>();

    for (const item of data.foodItems) {
      const oldId = item.id!;
      const { id, image: imageData, ...rest } = item;
      const image = imageData ? base64ToBlob(imageData) : undefined;
      const newId = await db.foodItems.add({ ...rest, image } as FoodItem);
      idMap.set(oldId, newId as number);
    }

    // Import log entries with remapped food IDs
    for (const entry of data.logEntries) {
      const { id, ...rest } = entry;
      const mappedFoodId = idMap.get(rest.foodItemId) ?? rest.foodItemId;
      await db.logEntries.add({ ...rest, foodItemId: mappedFoodId });
    }
  });

  return { foods: data.foodItems.length, entries: data.logEntries.length };
}
