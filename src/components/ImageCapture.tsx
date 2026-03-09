import { useRef } from 'react';
import { compressImage, blobToUrl } from '../utils/imageUtils';
import { useEffect, useState } from 'react';

interface ImageCaptureProps {
  image: Blob | undefined;
  onChange: (blob: Blob | undefined) => void;
}

export default function ImageCapture({ image, onChange }: ImageCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    const url = blobToUrl(image);
    setPreviewUrl(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [image]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    onChange(compressed);
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-600 hover:border-cyan-500/50 flex items-center justify-center overflow-hidden bg-neutral-800 shrink-0 transition-colors"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
        ) : (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      {image && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-base text-rose-400 hover:text-rose-300 transition-colors"
        >
          Remove
        </button>
      )}
    </div>
  );
}
