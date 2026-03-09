import type { ToastMessage } from '../App';

export default function Toast({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-neutral-900 text-cyan-300 px-6 py-3 rounded-full shadow-lg text-base font-semibold border border-cyan-400/30"
          style={{ animation: 'toast-in 0.25s ease-out, toast-glow 2s ease-in-out' }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
