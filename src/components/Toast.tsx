import type { ToastMessage } from '../App';

export default function Toast({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
