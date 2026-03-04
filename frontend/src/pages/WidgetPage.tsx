import { useSearchParams } from 'react-router-dom';
import Widget from '@/components/Widget';

export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const size = (searchParams.get('size') || 'large') as 'small' | 'large';

  // Apple-style widget display: NO padding, NO centering, exact dimensions
  // Small: 170×170px (1:1 square), Large: 360×170px (2.1:1 wide rectangle)
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800">
      <Widget size={size} />
    </div>
  );
}
