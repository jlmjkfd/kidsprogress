import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the main page correctly', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Kids Progress/);

    // Check header is visible
    await expect(page.getByText('Kids Progress')).toBeVisible();

    // Check sidebar navigation items
    await expect(page.getByText('🎨 Language Arts')).toBeVisible();
    await expect(page.getByText('🔢 Math')).toBeVisible();

    // Check chat window
    await expect(page.getByText('Start a conversation!')).toBeVisible();
  });

  test('should navigate through sidebar menu', async ({ page }) => {
    await page.goto('/');

    // Expand Language Arts menu
    await page.click('text=🎨 Language Arts');
    await expect(page.getByText('✏️ Writing')).toBeVisible();

    // Click on Writing
    await page.click('text=✏️ Writing');
    
    // Should navigate to writing page
    await expect(page.url()).toContain('/writing');
    await expect(page.getByText('Your Amazing Stories')).toBeVisible();
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      // On mobile, sidebar should be collapsed initially
      await expect(page.getByText('🎨 Language Arts')).not.toBeVisible();
      
      // Click mobile menu button
      await page.click('[data-testid="mobile-sidebar-toggle"]');
      await expect(page.getByText('🎨 Language Arts')).toBeVisible();
    } else {
      // On desktop, sidebar should be visible
      await expect(page.getByText('🎨 Language Arts')).toBeVisible();
    }
  });

  test('should display analytics in header', async ({ page }) => {
    // Mock API response
    await page.route('/api/analytics/summary', async route => {
      await route.fulfill({
        json: {
          totalWritings: 5,
          averageScore: 8.5,
          totalTime: 120
        }
      });
    });

    await page.goto('/');

    // Wait for analytics to load
    await expect(page.getByText('5')).toBeVisible();
    await expect(page.getByText('8.5')).toBeVisible();
    await expect(page.getByText('2h')).toBeVisible();
  });
});