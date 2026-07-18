import { useRef, useState, type DragEvent } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { uploadFile, type StoredFile } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  /** Called with the stored file once the upload is confirmed READY. */
  onUploaded: (file: StoredFile) => void;
  /** File-picker filter, e.g. "image/*" or ".pdf,image/*". Also enforced loosely. */
  accept?: string;
  /** Button / drop-zone label. */
  label?: string;
  /** Client-side size guard (bytes). The platform also caps this server-side. */
  maxBytes?: number;
  className?: string;
}

/**
 * Drop-zone + picker that uploads a file/image to the app's PRIVATE brokered
 * storage (per app + per user). The bytes go straight to S3 via a presigned URL —
 * never through the app server — so no credential is exposed and it works past
 * the serverless payload cap. Reusable across any generated app.
 */
export function FileUpload({
  onUploaded,
  accept,
  label = 'Upload a file',
  maxBytes = 25 * 1024 * 1024,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > maxBytes) {
      setError(`That file is too large — max ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onUploaded(await uploadFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — try again.');
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    void handle(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ''; // allow re-selecting the same file
          void handle(f);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-sm transition-colors',
          'border-slate-900/15 text-muted-foreground hover:border-accent/50 hover:text-foreground',
          'dark:border-white/15',
          dragging && 'border-accent bg-accent/5 text-foreground',
          busy && 'cursor-wait opacity-70',
        )}
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </span>
        <span className="font-medium">{busy ? 'Uploading…' : label}</span>
        <span className="text-xs text-muted-foreground">
          Drag &amp; drop or click to choose{accept?.includes('image') ? ' an image' : ' a file'}
        </span>
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default FileUpload;
