import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { db } from '../db';
import { lastNDays, dayLabel } from '../utils/dates';

const DAYS = 14;
const DAILY_TARGET = 2000;

export default function StatsPage() {
  const days = lastNDays(DAYS);
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
  const trend = avg7 > avgPrev7 ? '↑' : avg7 < avgPrev7 ? '↓' : '→';
  const trendColor = avg7 > avgPrev7 ? 'text-red-500' : avg7 < avgPrev7 ? 'text-green-500' : 'text-slate-400';

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Statistics</h1>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-slate-400">7-day average</div>
            <div className="text-2xl font-bold text-slate-700">{avg7} kcal</div>
          </div>
          <div className={`text-3xl ${trendColor}`}>{trend}</div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <ReferenceLine y={DAILY_TARGET} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `${DAILY_TARGET}`, fontSize: 10, fill: '#f59e0b' }} />
            <Bar dataKey="kcal" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
