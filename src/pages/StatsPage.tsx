import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { db } from '../db';
import { lastNDays, dayLabel, todayKey, dayKeyFor } from '../utils/dates';
import { exportData, importData } from '../utils/dataIO';
import { startOfWeek, subDays } from 'date-fns';

const DAYS = 7;
const DAILY_TARGET = 2000;

export default function StatsPage() {
  const days = lastNDays(DAYS);
  const today = todayKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  // Chart data (7 days)
  const entries = useLiveQuery(
    () => db.logEntries.where('dayKey').anyOf(days).toArray(),
    [days.join(',')]
  );

  // Weekly totals
  const thisWeekStart = dayKeyFor(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const lastWeekStart = dayKeyFor(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7));

  const thisWeekEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').between(thisWeekStart, today + '\uffff').toArray(),
    [thisWeekStart, today]
  );
  const lastWeekEntries = useLiveQuery(
    () => db.logEntries.where('dayKey').between(lastWeekStart, thisWeekStart).toArray(),
    [lastWeekStart, thisWeekStart]
  );

  const thisWeekKcal = thisWeekEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;
  const lastWeekKcal = lastWeekEntries?.reduce((sum, e) => sum + e.kcal, 0) ?? 0;

  const chartData = days.map((day) => {
    const dayEntries = entries?.filter((e) => e.dayKey === day) ?? [];
    const total = dayEntries.reduce((sum, e) => sum + e.kcal, 0);
    return { day, label: dayLabel(day), kcal: total };
  });

  const avg7 = Math.round(chartData.reduce((s, d) => s + d.kcal, 0) / 7);
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
    <div className="p-4 space-y-4 h-full overflow-y-auto">
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

      {/* Chart — 7 days, tall and readable */}
      <div className="bg-neutral-850 rounded-2xl p-4 border-2 border-neutral-700">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 5, bottom: 5, left: -10 }}>
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
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data management */}
      <div className="bg-neutral-850 rounded-2xl p-5 border-2 border-neutral-700 space-y-4">
        <div className="text-base text-white uppercase tracking-widest font-bold">Data</div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-600 text-white rounded-xl py-4 text-lg font-bold transition-all active:scale-[0.98]"
          >
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-600 text-white rounded-xl py-4 text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import'}
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
    </div>
  );
}
