import {
  WidgetContainer,
  WidgetButton,
  widgetText,
  widgetGradients
} from '@clarittyai/widget-toolkit';

interface TestWidgetProps {
  size?: 'small' | 'large';
}

export default function TestWidget({ size = 'large' }: TestWidgetProps) {
  return (
    <WidgetContainer
      size={size}
      padding="default"
      className={widgetGradients.sunset}
    >
      <div className="flex flex-col gap-3 h-full justify-center items-center">
        <div className={widgetText.display}>✅</div>
        <div className={widgetText.headline}>Widget Toolkit Works!</div>
        <div className={widgetText.caption}>Installed from GitHub Packages</div>

        {size === 'large' && (
          <WidgetButton variant="primary">
            Test Button
          </WidgetButton>
        )}
      </div>
    </WidgetContainer>
  );
}
