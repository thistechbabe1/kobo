/**
 * Playwright E2E verification for the landing page hero preview layout across 8 viewports.
 * Asserts bounding box, viewport fit, zero horizontal scroll, and ancestor non-clipping.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop-1920x1080', isDesktop: true, isMobile: false },
  { width: 1440, height: 900, name: 'desktop-1440x900', isDesktop: true, isMobile: false },
  { width: 1366, height: 768, name: 'desktop-1366x768', isDesktop: true, isMobile: false },
  { width: 1280, height: 720, name: 'desktop-1280x720', isDesktop: true, isMobile: false },
  { width: 1024, height: 768, name: 'desktop-1024x768', isDesktop: true, isMobile: false },
  { width: 768, height: 1024, name: 'tablet-768x1024', isDesktop: false, isMobile: false },
  { width: 390, height: 844, name: 'mobile-390x844', isDesktop: false, isMobile: true },
  { width: 360, height: 740, name: 'mobile-360x740', isDesktop: false, isMobile: true },
];

const SCREENSHOT_VIEWPORTS = [
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 390, height: 844, label: '390x844' },
];

// Output to gitignored test-results by default; can be overridden via SCREENSHOT_OUT_DIR
const SCREENSHOT_DIR =
  process.env.SCREENSHOT_OUT_DIR ||
  path.join(process.cwd(), 'test-results', 'landing-preview-screenshots');

const FALLBACK_ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity/brain/ded00ede-b722-4003-9e87-655d1cf608b8/landing-preview-screenshots';

test.describe('Landing Page Preview Composition & Responsive Layout', () => {
  for (const vp of VIEWPORTS) {
    test(`verifies bounding box, viewport fit, and ancestor non-clipping at ${vp.width}x${vp.height} (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'networkidle' });

      const previewLocator = page.locator('[data-testid="landing-preview"]');
      await expect(previewLocator).toBeVisible();

      // Evaluate document dimensions, preview bounding box, ancestors, and demo guide placement
      const metrics = await page.evaluate(() => {
        const preview = document.querySelector('[data-testid="landing-preview"]') as HTMLElement;
        const rect = preview.getBoundingClientRect();
        const docEl = document.documentElement;

        const docScrollWidth = docEl.scrollWidth;
        const docClientWidth = docEl.clientWidth;
        const docScrollHeight = docEl.scrollHeight;

        // Check all ancestors for clipping
        const clippingAncestors: { tag: string; class: string; reason: string }[] = [];
        let current = preview.parentElement;
        while (current && current !== docEl) {
          const style = window.getComputedStyle(current);
          const ox = style.overflowX;
          const oy = style.overflowY;
          const hasOverflowClip =
            ox === 'hidden' || ox === 'clip' || ox === 'scroll' ||
            oy === 'hidden' || oy === 'clip' || oy === 'scroll';

          if (hasOverflowClip) {
            const ancestorRect = current.getBoundingClientRect();
            // Allow 0.5px subpixel tolerance
            if (rect.left < ancestorRect.left - 0.5 || rect.right > ancestorRect.right + 0.5) {
              clippingAncestors.push({
                tag: current.tagName,
                class: current.className,
                reason: `Horizontal clip: preview [${rect.left}, ${rect.right}] vs ancestor [${ancestorRect.left}, ${ancestorRect.right}]`,
              });
            }
            if (rect.top < ancestorRect.top - 0.5 || rect.bottom > ancestorRect.bottom + 0.5) {
              clippingAncestors.push({
                tag: current.tagName,
                class: current.className,
                reason: `Vertical clip: preview [${rect.top}, ${rect.bottom}] vs ancestor [${ancestorRect.top}, ${ancestorRect.bottom}]`,
              });
            }
          }
          current = current.parentElement;
        }

        // Check Demo Guide placement
        const floatingBtn = document.querySelector('[data-testid="demo-guide-floating-btn"]') as HTMLElement | null;
        const mobileLink = document.querySelector('[data-testid="demo-guide-mobile-link"]') as HTMLElement | null;

        let floatingVisible = false;
        let floatingIntersectsPreview = false;
        if (floatingBtn) {
          const style = window.getComputedStyle(floatingBtn);
          floatingVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          if (floatingVisible) {
            const fRect = floatingBtn.getBoundingClientRect();
            floatingIntersectsPreview = !(
              fRect.right < rect.left ||
              fRect.left > rect.right ||
              fRect.bottom < rect.top ||
              fRect.top > rect.bottom
            );
          }
        }

        let mobileLinkIntersectsPreview = false;
        let mobileLinkVisible = false;
        if (mobileLink) {
          const mStyle = window.getComputedStyle(mobileLink);
          mobileLinkVisible = mStyle.display !== 'none' && mStyle.visibility !== 'hidden';
          if (mobileLinkVisible) {
            const mRect = mobileLink.getBoundingClientRect();
            mobileLinkIntersectsPreview = !(
              mRect.right < rect.left ||
              mRect.left > rect.right ||
              mRect.bottom < rect.top ||
              mRect.top > rect.bottom
            );
          }
        }

        return {
          previewRect: {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          },
          docScrollWidth,
          docClientWidth,
          docScrollHeight,
          windowHeight: window.innerHeight,
          clippingAncestors,
          floatingVisible,
          floatingIntersectsPreview,
          mobileLinkVisible,
          mobileLinkIntersectsPreview,
        };
      });

      // 1. Assert no horizontal page overflow
      expect(metrics.docScrollWidth).toBeLessThanOrEqual(metrics.docClientWidth);

      // 2. Assert preview is fully inside document bounds
      expect(metrics.previewRect.left).toBeGreaterThanOrEqual(0);
      expect(metrics.previewRect.right).toBeLessThanOrEqual(metrics.docClientWidth);
      expect(metrics.previewRect.top).toBeGreaterThanOrEqual(0);
      expect(metrics.previewRect.bottom).toBeLessThanOrEqual(metrics.docScrollHeight);

      // 3. At desktop sizes (>= 1024), assert fully inside first viewport (bottom <= window.innerHeight)
      if (vp.isDesktop) {
        expect(metrics.previewRect.bottom).toBeLessThanOrEqual(metrics.windowHeight);
      }

      // 4. Assert no ancestor clips the preview
      expect(metrics.clippingAncestors).toEqual([]);

      // 5. Assert Demo Guide button does NOT intersect the preview
      expect(metrics.floatingIntersectsPreview).toBe(false);
      expect(metrics.mobileLinkIntersectsPreview).toBe(false);

      // 6. On mobile, floating button must NOT be visible (hidden below sm)
      if (vp.isMobile) {
        expect(metrics.floatingVisible).toBe(false);
      }
    });
  }

  test('captures first-viewport screenshots (not full page) at 1366x768, 1280x720, 390x844 in light and dark @visual', async ({
    page,
  }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const hasFallbackDir = fs.existsSync(path.dirname(FALLBACK_ARTIFACT_DIR));
    if (hasFallbackDir) {
      fs.mkdirSync(FALLBACK_ARTIFACT_DIR, { recursive: true });
    }

    for (const vp of SCREENSHOT_VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Light Mode capture
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      });
      await page.waitForTimeout(300);

      const lightFileName = `preview-${vp.label}-light.png`;
      const lightPath = path.join(SCREENSHOT_DIR, lightFileName);
      await page.screenshot({ path: lightPath, fullPage: false });
      if (hasFallbackDir) {
        fs.copyFileSync(lightPath, path.join(FALLBACK_ARTIFACT_DIR, lightFileName));
      }

      // Dark Mode capture
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });
      await page.waitForTimeout(300);

      const darkFileName = `preview-${vp.label}-dark.png`;
      const darkPath = path.join(SCREENSHOT_DIR, darkFileName);
      await page.screenshot({ path: darkPath, fullPage: false });
      if (hasFallbackDir) {
        fs.copyFileSync(darkPath, path.join(FALLBACK_ARTIFACT_DIR, darkFileName));
      }
    }
  });
});
