import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { db } from '../db';
import { lastNDays, dayLabel, todayKey, dayKeyFor } from '../utils/dates';
import { exportData, importData } from '../utils/dataIO';
import { startOfWeek, subDays } from 'date-fns';

const CHART_DAYS = 7;
const SMA_LOOKBACK = 14;
const DAILY_TARGET = 2000;

export default function StatsPage() {
  const chartDays = lastNDays(CHART_DAYS);
  const allDays = lastNDays(CHART_DAYS + SMA_LOOKBACK);
  const today = todayKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [showNet, setShowNet] = useState(false);

  const foodEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').anyOf(allDays).toArray(),
    [allDays.join(',')]
  );

  const exerciseEntries = useLiveQuery(
    () => db.exerciseEntries.where('dayKey').anyOf(allDays).toArray(),
    [allDays.join(',')]
  );

  // Weekly totals
  const thisWeekStart = dayKeyFor(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const lastWeekStart = dayKeyFor(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7));

  const thisWeekFood = useLiveQuery(
    () => db.logEntries.where('dayKey').between(thisWeekStart, today + '\uffff').toArray(),
    [thisWeekStart, today]
  );
  const lastWeekFood = useLiveQuery(
    () => db.logEntries.where('dayKey').between(lastWeekStart, thisWeekStart).toArray(),
    [lastWeekStart, thisWeekStart]
  );
  const thisWeekExercise = useLiveQuery(
    () => db.exerciseEntries.where('dayKey').between(thisWeekStart, today + '\uffff').toArray(),
    [thisWeekStart, today]
  );
  const lastWeekExercise = useLiveQuery(
    () => db.exerciseEntries.where('dayKey').between(lastWeekStart, thisWeekStart).toArray(),
    [lastWeekStart, thisWeekStart]
  );

  const thisWeekFoodKcal = thisWeekFood?.reduce((s, e) => s + e.kcal, 0) ?? 0;
  const lastWeekFoodKcal = lastWeekFood?.reduce((s, e) => s + e.kcal, 0) ?? 0;
  const thisWeekExKcal = thisWeekExercise?.reduce((s, e) => s + e.kcal, 0) ?? 0;
  const lastWeekExKcal = lastWeekExercise?.reduce((s, e) => s + e.kcal, 0) ?? 0;

  const thisWeekKcal = showNet ? thisWeekFoodKcal - thisWeekExKcal : thisWeekFoodKcal;
  const lastWeekKcal = showNet ? lastWeekFoodKcal - lastWeekExKcal : lastWeekFoodKcal;

  // Build daily kcal for all days
  const dailyFood = new Map<string, number>();
  const dailyExercise = new Map<string, number>();
  for (const day of allDays) {
    dailyFood.set(day, foodEntries?.filter((e) => e.dayKey === day).reduce((s, e) => s + e.kcal, 0) ?? 0);
    dailyExercise.set(day, exerciseEntries?.filter((e) => e.dayKey === day).reduce((s, e) => s + e.kcal, 0) ?? 0);
  }

  function dayValue(day: string): number {
    const food = dailyFood.get(day) ?? 0;
    return showNet ? food - (dailyExercise.get(day) ?? 0) : food;
  }

  function sma(dayIndex: number, window: number): number | null {
    const startIdx = dayIndex - window + 1;
    if (startIdx < 0) return null;
    let sum = 0;
    for (let i = startIdx; i <= dayIndex; i++) {
      sum += dayValue(allDays[i]);
    }
    return Math.round(sum / window);
  }

  const chartData = chartDays.map((day) => {
    const allDayIdx = allDays.indexOf(day);
    return {
      day,
      label: dayLabel(day),
      kcal: dayValue(day),
      sma3: sma(allDayIdx, 3),
      sma7: sma(allDayIdx, 7),
      sma14: sma(allDayIdx, 14),
    };
  });

  const avg7 = Math.round(chartData.reduce((s, d) => s + d.kcal, 0) / CHART_DAYS);
  const trend = thisWeekKcal > lastWeekKcal ? 'up' : thisWeekKcal < lastWeekKcal ? 'down' : 'flat';

  async function handleExport() {
    try {
      await exportData();
      setMessage('Exported!');
    } catch {
      setMessage('Export failed');
    }
    setTimeout(() => setMessage(''), 2000);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importData(file);
      setMessage(`Imported ${result.foods} foods, ${result.entries} entries`);
    } catch {
      setMessage('Import failed — invalid file');
    }
    setImporting(false);
    e.target.value = '';
    setTimeout(() => setMessage(''), 3000);
  }

  return (
    <div className="p-4 space-y-3 h-full overflow-y-auto">
      {/* Weekly summary */}
      <div className="flex justify-between items-baseline">
        <div>
          <span className="font-[family-name:var(--font-display)] text-4xl text-cyan-400 font-bold">{avg7}</span>
          <span className="text-sm text-white font-bold ml-1">avg/day</span>
        </div>
        <div className={`flex items-center gap-1 ${
          trend === 'up' ? 'text-rose-400' : trend === 'down' ? 'text-emerald-400' : 'text-neutral-400'
        }`}>
          {trend === 'up' && '▲'}
          {trend === 'down' && '▼'}
          {trend === 'flat' && '—'}
        </div>
      </div>

      {/* Weekly totals */}
      <div className="flex gap-3">
        <div className="flex-1 bg-neutral-850 rounded-xl py-3 px-4 border-2 border-neutral-700">
          <div className="text-xs text-neutral-400 uppercase tracking-wider font-bold">This week</div>
          <div className="text-2xl font-bold text-white tabular-nums">{thisWeekKcal}</div>
        </div>
        <div className="flex-1 bg-neutral-850 rounded-xl py-3 px-4 border-2 border-neutral-700">
          <div className="text-xs text-neutral-400 uppercase tracking-wider font-bold">Last week</div>
          <div className="text-2xl font-bold text-white tabular-nums">{lastWeekKcal}</div>
        </div>
      </div>

      {/* Food / Net toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-neutral-800 rounded-lg border border-neutral-700 p-0.5">
          <button
            onClick={() => setShowNet(false)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${!showNet ? 'bg-cyan-500 text-black' : 'text-neutral-400'}`}
          >
            Food
          </button>
          <button
            onClick={() => setShowNet(true)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${showNet ? 'bg-cyan-500 text-black' : 'text-neutral-400'}`}
          >
            Net
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-neutral-850 rounded-2xl p-4 border-2 border-neutral-700">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 25, right: 5, bottom: 5, left: -10 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 14, fill: '#ccc', fontWeight: 'bold' }}
              interval={0}
              axisLine={{ stroke: '#444' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#888' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={DAILY_TARGET}
              stroke="#0891b2"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Bar
              dataKey="kcal"
              radius={[6, 6, 0, 0]}
              label={{ position: 'top', fill: '#ccc', fontSize: 13, fontWeight: 'bold' }}
            >
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.day === today ? '#22d3ee' : '#0891b2'}
                  fillOpacity={entry.day === today ? 1 : 0.7}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="sma3" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="sma7" stroke="#f43f5e" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="sma14" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2 text-xs font-bold">
          <span className="text-amber-400">— 3d</span>
          <span className="text-rose-500">— 7d</span>
          <span className="text-purple-400">— 14d</span>
        </div>
      </div>

      {/* Data — compact row */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex-1 bg-neutral-850 border-2 border-neutral-700 text-white rounded-xl py-3 text-base font-bold active:scale-[0.98] transition-all"
        >
          Export
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex-1 bg-neutral-850 border-2 border-neutral-700 text-white rounded-xl py-3 text-base font-bold active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {importing ? '...' : 'Import'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
      {message && (
        <div className="text-base text-cyan-400 text-center font-medium" style={{ animation: 'fade-up 0.2s ease-out' }}>
          {message}
        </div>
      )}
    </div>
  );
}
