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
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Food" className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-400 text-2xl">📷</span>
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
          className="text-xs text-red-500"
        >
          Remove
        </button>
      )}
    </div>
  );
}
