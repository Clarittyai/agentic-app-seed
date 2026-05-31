import { useSearchParams } from 'react-router-dom';
import Widget from '@/components/Widget';
import type { WidgetSize } from '@/lib/widget-sizes';

const SIZES: WidgetSize[] = ['small', 'medium', 'large'];

export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const raw = (searchParams.get('size') || 'large') as WidgetSize;
  const size: WidgetSize = SIZES.includes(raw) ? raw : 'large';

  // Bare widget host (the platform embeds this in an iframe at exact dims):
  //   small 170×170, medium 360×170, large 360×360.
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Widget size={size} />
    </div>
  );
}
