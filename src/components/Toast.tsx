import type { ToastMessage } from '../App';

export default function Toast({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-neutral-800/95 backdrop-blur-md text-cyan-400 px-5 py-2.5 rounded-full shadow-lg text-sm font-medium border border-cyan-400/20"
          style={{ animation: 'toast-in 0.25s ease-out, toast-glow 2s ease-in-out' }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
