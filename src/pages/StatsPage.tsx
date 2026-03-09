import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { db } from '../db';
import { lastNDays, dayLabel } from '../utils/dates';
import { exportData, importData } from '../utils/dataIO';

const DAYS = 14;
const DAILY_TARGET = 2000;

export default function StatsPage() {
  const days = lastNDays(DAYS);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const entries = useLiveQuery(
    () => db.logEntries.where('dayKey').anyOf(days).toArray(),
    [days.join(',')]
  );

  const chartData = days.map((day) => {
    const dayEntries = entries?.filter((e) => e.dayKey === day) ?? [];
    const total = dayEntries.reduce((sum, e) => sum + e.kcal, 0);
    return { day, label: dayLabel(day), kcal: total };
  });

  const last7 = chartData.slice(-7);
  const avg7 = Math.round(last7.reduce((s, d) => s + d.kcal, 0) / 7);
  const prev7 = chartData.slice(-14, -7);
  const avgPrev7 = Math.round(prev7.reduce((s, d) => s + d.kcal, 0) / 7);
  const trend = avg7 > avgPrev7 ? 'up' : avg7 < avgPrev7 ? 'down' : 'flat';

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
    <div className="p-4 space-y-5 h-full overflow-y-auto">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-neutral-200">Statistics</h1>

      {/* Average card */}
      <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium">7-day average</div>
            <div className="font-[family-name:var(--font-display)] text-3xl text-neutral-200 mt-0.5">{avg7} <span className="text-lg text-neutral-500">kcal</span></div>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            trend === 'up' ? 'bg-rose-500/10 border border-rose-500/20' :
            trend === 'down' ? 'bg-emerald-500/10 border border-emerald-500/20' :
            'bg-neutral-800 border border-neutral-700'
          }`}>
            {trend === 'up' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
              </svg>
            )}
            {trend === 'down' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
              </svg>
            )}
            {trend === 'flat' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
              </svg>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#71717a' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
              axisLine={{ stroke: '#27272a' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#71717a' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine
              y={DAILY_TARGET}
              stroke="#0891b2"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: `${DAILY_TARGET}`, fontSize: 9, fill: '#0891b2' }}
            />
            <Bar
              dataKey="kcal"
              fill="#22d3ee"
              radius={[4, 4, 0, 0]}
              fillOpacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data management */}
      <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 space-y-3">
        <div className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium">Data</div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.98]"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import JSON'}
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
          <div className="text-xs text-cyan-400 text-center" style={{ animation: 'fade-up 0.2s ease-out' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
