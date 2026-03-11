import { useRef, useCallback, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { todayKey, dayKeyFor } from '../utils/dates';
import { blobToUrl } from '../utils/imageUtils';
import { subDays } from 'date-fns';
import type { FoodItem, LogEntry } from '../models';
import FoodCard from '../components/FoodCard';
import FoodForm from '../components/FoodForm';

const LONG_PRESS_MS = 500;

interface LogPageProps {
  showToast: (text: string) => void;
}

interface GroupedEntry {
  foodItemId: number;
  kcalPerServing: number;
  count: number;
  totalKcal: number;
  entries: LogEntry[];
}

export default function LogPage({ showToast }: LogPageProps) {
  // Refresh todayKey when app resumes / tab becomes visible
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setToday(todayKey()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [activeEditId, setActiveEditId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persisted "start new day" — stored as the date string when dismissed
  const dayStartedRaw = useLiveQuery(
    () => db.settings.get('dayStarted'),
    []
  );
  const yesterdayDismissed = dayStartedRaw?.value === today;
  const setYesterdayDismissed = useCallback(() => {
    db.settings.put({ key: 'dayStarted', value: today });
  }, [today]);

  // Stable display order — lock the order of foodItemIds so it doesn't reshuffle
  const stableOrderRef = useRef<number[]>([]);
  const stableYesterdayOrderRef = useRef<number[]>([]);

  // Register overlay close callback for Android back button
  useEffect(() => {
    (window as any).__closeOverlay = () => {
      if (adding || editing) {
        setAdding(false);
        setEditing(null);
        return true;
      }
      if (catalogueOpen) {
        setCatalogueOpen(false);
        return true;
      }
      return false;
    };
    return () => { (window as any).__closeOverlay = null; };
  }, [adding, editing, catalogueOpen]);

  const foodItems = useLiveQuery(() => db.foodItems.toArray());
  const yesterday = dayKeyFor(subDays(new Date(), 1));

  const todayEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').equals(today).toArray(),
    [today]
  );
  const yesterdayEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').equals(yesterday).toArray(),
    [yesterday]
  );
  const allEntries = useLiveQuery(() => db.logEntries.toArray());

  const sortedFoods = (() => {
    if (!foodItems || !allEntries) return foodItems ?? [];
    const freq = new Map<number, number>();
    const recent = new Map<number, number>();
    for (const e of allEntries) {
      freq.set(e.foodItemId, (freq.get(e.foodItemId) ?? 0) + 1);
      const prev = recent.get(e.foodItemId) ?? 0;
      if (e.timestamp > prev) recent.set(e.foodItemId, e.timestamp);
    }
    return [...foodItems].sort((a, b) => {
      const scoreA = (freq.get(a.id!) ?? 0) * 1000 + (recent.get(a.id!) ?? 0) / 1e10;
      const scoreB = (freq.get(b.id!) ?? 0) * 1000 + (recent.get(b.id!) ?? 0) / 1e10;
      return scoreB - scoreA;
    });
  })();

  const totalKcal = todayEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;
  const yesterdayKcal = yesterdayEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;

  const grouped: GroupedEntry[] = (() => {
    if (!todayEntries) return [];
    const map = new Map<number, GroupedEntry>();
    for (const e of todayEntries) {
      const existing = map.get(e.foodItemId);
      if (existing) {
        existing.count++;
        existing.totalKcal += e.kcal;
        existing.entries.push(e);
      } else {
        map.set(e.foodItemId, {
          foodItemId: e.foodItemId,
          kcalPerServing: e.kcal,
          count: 1,
          totalKcal: e.kcal,
          entries: [e],
        });
      }
    }
    // Keep actively-edited item visible even at zero count
    if (activeEditId !== null && !map.has(activeEditId)) {
      const food = foodItems?.find((f) => f.id === activeEditId);
      if (food) {
        map.set(activeEditId, {
          foodItemId: activeEditId,
          kcalPerServing: food.kcal,
          count: 0,
          totalKcal: 0,
          entries: [],
        });
      }
    }
    const values = [...map.values()];
    // Stable order: never remove IDs from ref, only append new ones — prevents resorting on transient states
    const knownIds = new Set(stableOrderRef.current);
    const newIds = values.filter((g) => !knownIds.has(g.foodItemId)).map((g) => g.foodItemId);
    if (newIds.length > 0) stableOrderRef.current = [...stableOrderRef.current, ...newIds];
    const orderIndex = new Map(stableOrderRef.current.map((id, i) => [id, i]));
    return values.sort((a, b) => (orderIndex.get(a.foodItemId) ?? 0) - (orderIndex.get(b.foodItemId) ?? 0));
  })();

  const yesterdayGrouped: GroupedEntry[] = (() => {
    if (!yesterdayEntries) return [];
    const map = new Map<number, GroupedEntry>();
    for (const e of yesterdayEntries) {
      const existing = map.get(e.foodItemId);
      if (existing) {
        existing.count++;
        existing.totalKcal += e.kcal;
        existing.entries.push(e);
      } else {
        map.set(e.foodItemId, {
          foodItemId: e.foodItemId,
          kcalPerServing: e.kcal,
          count: 1,
          totalKcal: e.kcal,
          entries: [e],
        });
      }
    }
    if (activeEditId !== null && !map.has(activeEditId)) {
      const food = foodItems?.find((f) => f.id === activeEditId);
      if (food) {
        map.set(activeEditId, {
          foodItemId: activeEditId,
          kcalPerServing: food.kcal,
          count: 0,
          totalKcal: 0,
          entries: [],
        });
      }
    }
    const values = [...map.values()];
    const knownIds = new Set(stableYesterdayOrderRef.current);
    const newIds = values.filter((g) => !knownIds.has(g.foodItemId)).map((g) => g.foodItemId);
    if (newIds.length > 0) stableYesterdayOrderRef.current = [...stableYesterdayOrderRef.current, ...newIds];
    const orderIndex = new Map(stableYesterdayOrderRef.current.map((id, i) => [id, i]));
    return values.sort((a, b) => (orderIndex.get(a.foodItemId) ?? 0) - (orderIndex.get(b.foodItemId) ?? 0));
  })();

  // For showYesterday: exclude zero-count placeholder from check (don't count it as a real today entry)
  const hasRealTodayEntries = grouped.some((g) => g.count > 0);
  const showYesterday = !hasRealTodayEntries && yesterdayGrouped.length > 0 && !yesterdayDismissed;
  const activeDayKey = showYesterday ? yesterday : today;

  async function logFood(item: FoodItem) {
    await db.logEntries.add({
      foodItemId: item.id!,
      kcal: item.kcal,
      timestamp: Date.now(),
      dayKey: activeDayKey,
    });
    setCatalogueOpen(false);
    setHighlightId(item.id!);
    // Scroll to bottom after React re-renders with the new entry
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    });
    setTimeout(() => setHighlightId(null), 2000);
  }

  async function addOne(group: GroupedEntry) {
    const food = foodItems?.find((f) => f.id === group.foodItemId);
    const kcal = food?.kcal ?? group.kcalPerServing;
    await db.logEntries.add({
      foodItemId: group.foodItemId,
      kcal,
      timestamp: Date.now(),
      dayKey: activeDayKey,
    });
  }

  async function removeOne(group: GroupedEntry) {
    if (group.entries.length === 0) return;
    const oldest = group.entries.reduce((a, b) => (a.timestamp < b.timestamp ? a : b));
    await db.logEntries.delete(oldest.id!);
  }

  async function handleAddFood(data: { name: string; kcal: number; image?: Blob }) {
    await db.foodItems.add({ ...data, createdAt: Date.now() });
    setAdding(false);
    setCatalogueOpen(true);
    showToast(`Added ${data.name}`);
  }

  async function handleUpdateFood(data: { name: string; kcal: number; image?: Blob }) {
    if (!editing?.id) return;
    await db.foodItems.update(editing.id, data);
    setEditing(null);
    setCatalogueOpen(true);
    showToast(`Updated ${data.name}`);
  }

  async function handleDeleteFood() {
    if (!editing?.id) return;
    await db.foodItems.delete(editing.id);
    setEditing(null);
    setCatalogueOpen(true);
    showToast('Deleted');
  }

  // FoodForm overlay
  if (adding || editing) {
    return (
      <SwipeToCancel onCancel={() => { setAdding(false); setEditing(null); }}>
        <div className="p-4 h-full overflow-y-auto">
          <FoodForm
            initial={editing ?? undefined}
            onSave={editing ? handleUpdateFood : handleAddFood}
            onCancel={() => { setAdding(false); setEditing(null); }}
            onDelete={editing ? handleDeleteFood : undefined}
          />
        </div>
      </SwipeToCancel>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4 pb-24 space-y-3">
      {/* Today + yesterday */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="font-[family-name:var(--font-display)] text-4xl text-cyan-400 font-bold"
                style={{ textShadow: '0 0 30px rgba(34,211,238,0.3)' }}>
            {totalKcal}
          </span>
          <span className="text-sm text-white font-bold ml-1">today</span>
        </div>
        <div className="text-base text-neutral-300 tabular-nums">
          <span className="text-neutral-500">yesterday </span><span className="font-bold">{yesterdayKcal}</span>
        </div>
      </div>

      <div className="h-px bg-neutral-700" />

      {/* Log entries */}
      {!hasRealTodayEntries && !showYesterday && activeEditId === null ? (
        <div className="text-center py-6">
          <div className="text-neutral-400 text-lg italic font-[family-name:var(--font-display)]">
            Tap + to log food
          </div>
        </div>
      ) : !hasRealTodayEntries && showYesterday ? (
        <div className="space-y-3">
          <button
            onClick={() => setYesterdayDismissed()}
            className="w-full py-3 rounded-xl bg-cyan-500/15 border-2 border-cyan-500/40 text-cyan-300 font-bold text-lg active:scale-[0.97] transition-transform"
          >
            Start new day
          </button>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 text-sm uppercase tracking-widest font-bold">Yesterday&apos;s log</span>
            <span className="text-neutral-500 text-sm tabular-nums">{yesterdayKcal} kcal</span>
          </div>
          <div className="space-y-2">
            {yesterdayGrouped.map((group) => (
              <LogRow
                key={group.foodItemId}
                group={group}
                foodItems={foodItems}
                onAdd={() => addOne(group)}
                onRemove={() => removeOne(group)}
                onActivate={() => setActiveEditId(group.foodItemId)}
                onDeactivate={() => setActiveEditId(null)}
                highlight={highlightId === group.foodItemId}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map((group) => (
            <LogRow
              key={group.foodItemId}
              group={group}
              foodItems={foodItems}
              onAdd={() => addOne(group)}
              onRemove={() => removeOne(group)}
              onActivate={() => setActiveEditId(group.foodItemId)}
              onDeactivate={() => setActiveEditId(null)}
              highlight={highlightId === group.foodItemId}
            />
          ))}
        </div>
      )}

      {/* FAB — open catalogue */}
      <button
        onClick={() => setCatalogueOpen(true)}
        className="fixed bottom-20 right-4 bg-cyan-500 active:bg-cyan-400 text-black rounded-full w-14 h-14 flex items-center justify-center text-3xl font-light shadow-lg shadow-cyan-500/30 active:scale-90 transition-all z-40"
      >
        +
      </button>

      {/* Catalogue popup */}
      {catalogueOpen && (
        <SwipeToCancel onCancel={() => setCatalogueOpen(false)}>
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
            <div className="flex-1 overflow-y-auto p-4 pt-[env(safe-area-inset-top)]">
              <div className="mb-4">
                <span className="text-lg font-bold text-white uppercase tracking-widest">Catalogue</span>
                <p className="text-sm text-neutral-400 mt-1">Tap to log &middot; long-press to edit &middot; swipe back to close</p>
              </div>

              {(() => {
                const activeGroups = showYesterday ? yesterdayGrouped : grouped;
                const loggedIds = new Set(activeGroups.filter((g) => g.count > 0).map((g) => g.foodItemId));
                const available = sortedFoods.filter((f) => !loggedIds.has(f.id!));
                return available.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-neutral-400 text-lg italic font-[family-name:var(--font-display)]">
                      {sortedFoods.length === 0 ? 'Tap + to add your first food' : 'All foods already logged'}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 pb-20">
                    {available.map((item) => (
                      <FoodCard
                        key={item.id}
                        item={item}
                        onTap={() => logFood(item)}
                        onLongPress={() => { setCatalogueOpen(false); setEditing(item); }}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Add food button — fixed at bottom, same position as the FAB */}
            <button
              onClick={() => { setCatalogueOpen(false); setAdding(true); }}
              className="fixed bottom-20 right-4 bg-cyan-500 active:bg-cyan-400 text-black rounded-full w-14 h-14 flex items-center justify-center text-3xl font-light shadow-lg shadow-cyan-500/30 active:scale-90 transition-all z-[60]"
            >
              +
            </button>
          </div>
        </SwipeToCancel>
      )}
    </div>
  );
}

function LogRow({
  group,
  foodItems,
  onAdd,
  onRemove,
  onActivate,
  onDeactivate,
  highlight,
}: {
  group: GroupedEntry;
  foodItems: FoodItem[] | undefined;
  onAdd: () => void;
  onRemove: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  highlight?: boolean;
}) {
  const food = foodItems?.find((f) => f.id === group.foodItemId);
  const [imgUrl, setImgUrl] = useState<string>();
  const [mode, setMode] = useState<'idle' | 'hint' | 'active'>('idle');
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touchMoved = useRef(false);

  useEffect(() => {
    const url = blobToUrl(food?.image);
    setImgUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [food?.image]);

  // Auto-dismiss hint after 1.5s
  const dismissTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(dismissTimer.current);
    if (mode === 'hint') {
      dismissTimer.current = setTimeout(() => setMode('idle'), 1500);
    }
    return () => clearTimeout(dismissTimer.current);
  }, [mode]);

  const handleTouchStart = useCallback(() => {
    touchMoved.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        setMode('active');
        onActivate();
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, LONG_PRESS_MS);
  }, [onActivate]);

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true;
    clearTimeout(longPressTimer.current);
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleTap = useCallback(() => {
    if (touchMoved.current) return;
    if (mode === 'idle') {
      setMode('hint');
    }
  }, [mode]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {mode === 'active' && (
          <button
            onClick={(e) => { e.stopPropagation(); if (group.count > 0) onRemove(); }}
            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-2xl shrink-0 active:scale-90 transition-transform ${
              group.count > 0 ? 'bg-rose-500/20 border-rose-500/60 text-rose-400' : 'bg-neutral-800 border-neutral-700 text-neutral-600'
            }`}
          >
            −
          </button>
        )}

        <div
          className={`flex-1 min-w-0 rounded-xl px-3 py-3 flex items-center gap-2 border-2 transition-colors select-none overflow-hidden ${
            highlight ? 'border-cyan-400 bg-cyan-500/10' : mode === 'hint' ? 'border-cyan-500/50 bg-neutral-850' : mode === 'active' ? 'border-cyan-400 bg-neutral-850' : 'border-neutral-700 bg-neutral-850'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
        >
          {imgUrl ? (
            <img src={imgUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-neutral-800 border border-neutral-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <span className="font-bold text-white truncate block">{food?.name ?? '...'}</span>
            {mode === 'hint' && (
              <span className="text-xs text-cyan-400 animate-pulse">Hold to adjust</span>
            )}
          </div>
          {(group.count > 1 || mode === 'active') && (
            <span className={`font-bold rounded-full px-2.5 py-0.5 border-2 shrink-0 ${
              group.count === 0 ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
            }`}>
              x{group.count}
            </span>
          )}
          <span className="text-white font-bold tabular-nums shrink-0">{group.totalKcal}</span>
        </div>

        {mode === 'active' && (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold text-2xl shrink-0 active:scale-90 transition-transform"
          >
            +
          </button>
        )}
      </div>

      {mode === 'active' && (
        <button
          onClick={() => { setMode('idle'); onDeactivate(); }}
          className="w-full py-3 rounded-xl bg-cyan-500 text-black font-bold text-base active:scale-[0.97] transition-transform"
        >
          Done
        </button>
      )}
    </div>
  );
}

function SwipeToCancel({ onCancel, children }: { onCancel: () => void; children: ReactNode }) {
  const startX = useRef(0);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dx > 80 && Math.abs(dx) > Math.abs(dy)) {
      onCancel();
    }
  }, [onCancel]);

  return (
    <div
      className="h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
