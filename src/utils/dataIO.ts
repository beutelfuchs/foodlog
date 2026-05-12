import { db } from '../db';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { FoodItem, LogEntry, ExerciseEntry } from '../models';

interface CatalogueExport {
  version: 1;
  type: 'catalogue';
  exportedAt: string;
  foodItems: (Omit<FoodItem, 'image'> & { image?: string })[];
}

interface LogExport {
  version: 1;
  type: 'log';
  exportedAt: string;
  logEntries: LogEntry[];
  exerciseEntries: ExerciseEntry[];
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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function shareJSON(data: object, basename: string): Promise<void> {
  const json = JSON.stringify(data);
  const now = new Date();
  const filename = `${basename}-${now.toISOString().slice(0, 16).replace('T', '_').replace(':', '')}.json`;

  try {
    const base64Data = arrayBufferToBase64(new TextEncoder().encode(json).buffer as ArrayBuffer);
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
    });
    await Share.share({ title: filename, url: result.uri });
  } catch {
    // Fallback for desktop browsers
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export async function exportCatalogue(): Promise<void> {
  const foodItems = await db.foodItems.toArray();
  const serialized = await Promise.all(
    foodItems.map(async (item) => {
      const { image, ...rest } = item;
      return { ...rest, image: image ? await blobToBase64(image) : undefined };
    })
  );
  const data: CatalogueExport = {
    version: 1,
    type: 'catalogue',
    exportedAt: new Date().toISOString(),
    foodItems: serialized,
  };
  await shareJSON(data, 'foodlog-catalogue');
}

export async function exportLog(): Promise<void> {
  const logEntries = await db.logEntries.toArray();
  const exerciseEntries = await db.exerciseEntries.toArray();
  const data: LogExport = {
    version: 1,
    type: 'log',
    exportedAt: new Date().toISOString(),
    logEntries,
    exerciseEntries,
  };
  await shareJSON(data, 'foodlog-log');
}

export async function importCatalogue(file: File): Promise<{ foods: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (data.version !== 1) throw new Error('Unsupported export version');
  if (data.type && data.type !== 'catalogue') throw new Error('Not a catalogue export');
  if (!Array.isArray(data.foodItems)) throw new Error('No catalogue data in file');

  // Preserve IDs so existing log entries continue to reference the correct items
  const items: FoodItem[] = data.foodItems.map((item: CatalogueExport['foodItems'][number]) => {
    const { image: imageData, ...rest } = item;
    return { ...rest, image: imageData ? base64ToBlob(imageData) : undefined };
  });

  await db.transaction('rw', db.foodItems, async () => {
    await db.foodItems.clear();
    await db.foodItems.bulkPut(items);
  });

  return { foods: items.length };
}

export async function importLog(file: File): Promise<{ entries: number; exercises: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (data.version !== 1) throw new Error('Unsupported export version');
  if (data.type && data.type !== 'log') throw new Error('Not a log export');
  if (!Array.isArray(data.logEntries)) throw new Error('No log data in file');

  const logEntries: LogEntry[] = data.logEntries;
  const exerciseEntries: ExerciseEntry[] = Array.isArray(data.exerciseEntries) ? data.exerciseEntries : [];

  await db.transaction('rw', db.logEntries, db.exerciseEntries, async () => {
    await db.logEntries.clear();
    await db.exerciseEntries.clear();
    for (const entry of logEntries) {
      const { id, ...rest } = entry;
      await db.logEntries.add(rest);
    }
    for (const entry of exerciseEntries) {
      const { id, ...rest } = entry;
      await db.exerciseEntries.add(rest);
    }
  });

  return { entries: logEntries.length, exercises: exerciseEntries.length };
}

export async function resetCatalogue(): Promise<void> {
  await db.foodItems.clear();
}

export async function resetLog(): Promise<void> {
  await db.transaction('rw', db.logEntries, db.exerciseEntries, async () => {
    await db.logEntries.clear();
    await db.exerciseEntries.clear();
  });
}
