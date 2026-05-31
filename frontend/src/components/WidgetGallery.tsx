import { useLayoutEffect, useRef, useState } from 'react';
import Widget from '@/components/Widget';
import { WIDGET_DIMENSIONS, type WidgetSize } from '@/lib/widget-sizes';

/**
 * Shows the app's widget at all three Claritty sizes (small 170×170, medium
 * 360×170, large 360×360) — each rendered as the real <Widget> at native pixel
 * dimensions, the way it appears on the dashboard. The widget brings its own
 * card shell, so we don't wrap it in another frame.
 *
 * Mobile-first: every preview scales down to fit the container width so the
 * 360px widgets never cause horizontal scroll on a phone; on wider screens they
 * show at native size.
 */

const SIZES: WidgetSize[] = ['small', 'medium', 'large'];

export default function WidgetGallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Scale so the widest widget (360px) fits the container on small screens.
  useLayoutEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth ?? 360;
      setScale(Math.min(1, w / WIDGET_DIMENSIONS.large.width));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col flex-wrap items-center justify-center gap-x-8 gap-y-6 overflow-hidden rounded-3xl border border-border bg-gradient-mesh px-4 py-10 sm:flex-row sm:items-end sm:px-8"
    >
      {/* Soft color orbs behind the widgets so the liquid-glass frosting reads
          (backdrop-blur needs colorful content behind it to look like glass). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-8 h-56 w-56 rounded-full bg-purple/20 blur-3xl"
      />
      {SIZES.map((size) => {
        const d = WIDGET_DIMENSIONS[size];
        return (
          <div key={size} className="relative z-10 flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {size} · {d.width}×{d.height}
            </span>
            {/* Outer box reserves the SCALED footprint so layout reflows; the
                inner box keeps native size and is shrunk via transform. */}
            <div style={{ width: d.width * scale, height: d.height * scale }}>
              <div
                style={{
                  width: d.width,
                  height: d.height,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <Widget size={size} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
