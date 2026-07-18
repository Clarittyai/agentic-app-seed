import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getFileUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AppImageProps {
  /** The stored file id (from uploadFile / listFiles). */
  fileId: string;
  alt?: string;
  className?: string;
}

/**
 * Renders an image stored in the app's private brokered storage. Fetches a FRESH
 * short-lived presigned GET URL each mount (they expire, so we never persist
 * one), shows a skeleton while loading and a graceful fallback on error.
 */
export function AppImage({ fileId, alt = '', className }: AppImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    getFileUrl(fileId)
      .then((u) => {
        if (!cancelled) (u ? setUrl(u) : setFailed(true));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-muted text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="h-5 w-5" />
      </div>
    );
  }

  if (!url) {
    return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={cn('rounded-xl object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}

export default AppImage;
