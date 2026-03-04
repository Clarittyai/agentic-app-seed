import { test, expect } from '@playwright/test';

/**
 * Widget Visual Constraints Tests
 *
 * These tests ensure widgets meet Apple-style design standards:
 * - Small widget: 170×170px (1:1 ratio - SQUARE)
 * - Large widget: 360×170px (2.1:1 ratio - WIDE RECTANGLE)
 * - Padding: 16px (p-4) constant
 * - Border radius: 24px (rounded-3xl)
 * - overflow-hidden prevents scrollbars
 */

test.describe('Widget Visual Constraints', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard where widgets are displayed
    await page.goto('http://localhost:3200');

    // Wait for widgets to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Small Widget (170×170px Square)', () => {
    test('has exact dimensions of 170×170px', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      await expect(smallWidget).toBeVisible();

      const box = await smallWidget.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        // Allow 1px tolerance for sub-pixel rendering
        expect(box.width).toBeCloseTo(170, 1);
        expect(box.height).toBeCloseTo(170, 1);
      }
    });

    test('has 1:1 aspect ratio (square)', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      const box = await smallWidget.boundingBox();

      if (box) {
        const aspectRatio = box.width / box.height;
        // Should be 1.0 for a square
        expect(aspectRatio).toBeCloseTo(1.0, 1);
      }
    });

    test('has 16px padding', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');

      // Check computed styles
      const padding = await smallWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          top: parseFloat(styles.paddingTop),
          right: parseFloat(styles.paddingRight),
          bottom: parseFloat(styles.paddingBottom),
          left: parseFloat(styles.paddingLeft),
        };
      });

      expect(padding.top).toBe(16);
      expect(padding.right).toBe(16);
      expect(padding.bottom).toBe(16);
      expect(padding.left).toBe(16);
    });

    test('has 24px border radius', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');

      const borderRadius = await smallWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.borderTopLeftRadius);
      });

      expect(borderRadius).toBe(24);
    });

    test('has overflow hidden', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');

      const overflow = await smallWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.overflow;
      });

      expect(overflow).toBe('hidden');
    });

    test('does not show scrollbars', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');

      // Check for scrollbar visibility
      const hasScrollbar = await smallWidget.evaluate((el) => {
        return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      });

      expect(hasScrollbar).toBe(false);
    });

    test('content does not overflow boundaries', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      const widgetBox = await smallWidget.boundingBox();

      // Get all child elements
      const children = await smallWidget.locator('*').all();

      for (const child of children) {
        const childBox = await child.boundingBox();

        if (widgetBox && childBox) {
          // Check if child is within widget bounds
          expect(childBox.x).toBeGreaterThanOrEqual(widgetBox.x);
          expect(childBox.y).toBeGreaterThanOrEqual(widgetBox.y);
          expect(childBox.x + childBox.width).toBeLessThanOrEqual(widgetBox.x + widgetBox.width);
          expect(childBox.y + childBox.height).toBeLessThanOrEqual(widgetBox.y + widgetBox.height);
        }
      }
    });
  });

  test.describe('Large Widget (360×170px Wide Rectangle)', () => {
    test('has exact dimensions of 360×170px', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');
      await expect(largeWidget).toBeVisible();

      const box = await largeWidget.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        // Allow 1px tolerance for sub-pixel rendering
        expect(box.width).toBeCloseTo(360, 1);
        expect(box.height).toBeCloseTo(170, 1);
      }
    });

    test('has 2.1:1 aspect ratio (wide rectangle)', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');
      const box = await largeWidget.boundingBox();

      if (box) {
        const aspectRatio = box.width / box.height;
        // Should be ~2.12 (360/170 = 2.117...)
        expect(aspectRatio).toBeCloseTo(2.1, 1);
      }
    });

    test('has 16px padding', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');

      // Check computed styles
      const padding = await largeWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          top: parseFloat(styles.paddingTop),
          right: parseFloat(styles.paddingRight),
          bottom: parseFloat(styles.paddingBottom),
          left: parseFloat(styles.paddingLeft),
        };
      });

      expect(padding.top).toBe(16);
      expect(padding.right).toBe(16);
      expect(padding.bottom).toBe(16);
      expect(padding.left).toBe(16);
    });

    test('has 24px border radius', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');

      const borderRadius = await largeWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.borderTopLeftRadius);
      });

      expect(borderRadius).toBe(24);
    });

    test('has overflow hidden', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');

      const overflow = await largeWidget.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.overflow;
      });

      expect(overflow).toBe('hidden');
    });

    test('does not show scrollbars', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');

      // Check for scrollbar visibility
      const hasScrollbar = await largeWidget.evaluate((el) => {
        return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      });

      expect(hasScrollbar).toBe(false);
    });

    test('content does not overflow boundaries', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');
      const widgetBox = await largeWidget.boundingBox();

      // Get all child elements
      const children = await largeWidget.locator('*').all();

      for (const child of children) {
        const childBox = await child.boundingBox();

        if (widgetBox && childBox) {
          // Check if child is within widget bounds
          expect(childBox.x).toBeGreaterThanOrEqual(widgetBox.x);
          expect(childBox.y).toBeGreaterThanOrEqual(widgetBox.y);
          expect(childBox.x + childBox.width).toBeLessThanOrEqual(widgetBox.x + widgetBox.width);
          expect(childBox.y + childBox.height).toBeLessThanOrEqual(widgetBox.y + widgetBox.height);
        }
      }
    });
  });

  test.describe('Consistent Styling', () => {
    test('both widgets have same padding', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      const largeWidget = page.locator('[data-widget-size="large"]');

      const smallPadding = await smallWidget.evaluate((el) => {
        return window.getComputedStyle(el).padding;
      });

      const largePadding = await largeWidget.evaluate((el) => {
        return window.getComputedStyle(el).padding;
      });

      expect(smallPadding).toBe(largePadding);
    });

    test('both widgets have same border radius', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      const largeWidget = page.locator('[data-widget-size="large"]');

      const smallRadius = await smallWidget.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });

      const largeRadius = await largeWidget.evaluate((el) => {
        return window.getComputedStyle(el).borderRadius;
      });

      expect(smallRadius).toBe(largeRadius);
    });

    test('both widgets have overflow hidden', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      const largeWidget = page.locator('[data-widget-size="large"]');

      const smallOverflow = await smallWidget.evaluate((el) => {
        return window.getComputedStyle(el).overflow;
      });

      const largeOverflow = await largeWidget.evaluate((el) => {
        return window.getComputedStyle(el).overflow;
      });

      expect(smallOverflow).toBe('hidden');
      expect(largeOverflow).toBe('hidden');
    });
  });

  test.describe('Visual Regression', () => {
    test('small widget visual snapshot', async ({ page }) => {
      const smallWidget = page.locator('[data-widget-size="small"]');
      await expect(smallWidget).toHaveScreenshot('small-widget.png', {
        maxDiffPixels: 100,
      });
    });

    test('large widget visual snapshot', async ({ page }) => {
      const largeWidget = page.locator('[data-widget-size="large"]');
      await expect(largeWidget).toHaveScreenshot('large-widget.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Responsive Behavior', () => {
    test('widgets maintain dimensions on different screen sizes', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 1366, height: 768, name: 'Laptop' },
        { width: 768, height: 1024, name: 'Tablet' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(500); // Allow reflow

        const smallWidget = page.locator('[data-widget-size="small"]');
        const largeWidget = page.locator('[data-widget-size="large"]');

        const smallBox = await smallWidget.boundingBox();
        const largeBox = await largeWidget.boundingBox();

        // Widgets should maintain exact dimensions regardless of viewport
        if (smallBox) {
          expect(smallBox.width).toBeCloseTo(170, 1);
          expect(smallBox.height).toBeCloseTo(170, 1);
        }

        if (largeBox) {
          expect(largeBox.width).toBeCloseTo(360, 1);
          expect(largeBox.height).toBeCloseTo(170, 1);
        }
      }
    });
  });

  test.describe('Loading and Error States', () => {
    test('loading state maintains widget dimensions', async ({ page }) => {
      // Intercept API to delay response
      await page.route('**/api/widget*', (route) => {
        setTimeout(() => route.continue(), 5000);
      });

      await page.goto('http://localhost:3200');

      const loadingWidget = page.locator('.animate-pulse').first();
      const box = await loadingWidget.boundingBox();

      if (box) {
        // Loading state should have either small or large dimensions
        const isSmall = Math.abs(box.width - 170) < 2 && Math.abs(box.height - 170) < 2;
        const isLarge = Math.abs(box.width - 360) < 2 && Math.abs(box.height - 170) < 2;

        expect(isSmall || isLarge).toBe(true);
      }
    });

    test('error state maintains widget dimensions', async ({ page }) => {
      // Intercept API to return error
      await page.route('**/api/widget*', (route) => {
        route.abort('failed');
      });

      await page.goto('http://localhost:3200');
      await page.waitForSelector('.text-destructive');

      const errorWidget = page.locator('.text-destructive').first();
      const box = await errorWidget.boundingBox();

      if (box) {
        // Error state should have either small or large dimensions
        const isSmall = Math.abs(box.width - 170) < 2 && Math.abs(box.height - 170) < 2;
        const isLarge = Math.abs(box.width - 360) < 2 && Math.abs(box.height - 170) < 2;

        expect(isSmall || isLarge).toBe(true);
      }
    });
  });
});
