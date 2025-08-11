import { test, expect } from '@playwright/test';

test.describe('AWY Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the widget demo page
    await page.goto('/');
  });

  test('should display the heart button', async ({ page }) => {
    // Wait for the widget to load
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    
    // Check if the heart button is visible
    const heartButton = page.locator('[data-testid="awy-heart-button"]');
    await expect(heartButton).toBeVisible();
  });

  test('should open drawer when heart button is clicked', async ({ page }) => {
    // Wait for the widget to load
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    
    // Click the heart button
    await page.click('[data-testid="awy-heart-button"]');
    
    // Check if the drawer opens
    const drawer = page.locator('[data-testid="awy-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should show connection status', async ({ page }) => {
    // Wait for the widget to load
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    
    // Check if the heart button shows a status (green, white, or grey)
    const heartButton = page.locator('[data-testid="awy-heart-button"]');
    const buttonClass = await heartButton.getAttribute('class');
    
    // Should have one of the status classes
    expect(buttonClass).toMatch(/(online|waiting|offline)/);
  });

  test('should navigate between tabs in drawer', async ({ page }) => {
    // Wait for the widget to load and open drawer
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    await page.click('[data-testid="awy-heart-button"]');
    
    // Wait for drawer to open
    await page.waitForSelector('[data-testid="awy-drawer"]');
    
    // Check if tabs are present
    const homeTab = page.locator('[data-testid="tab-home"]');
    const chatTab = page.locator('[data-testid="tab-chat"]');
    const memoriesTab = page.locator('[data-testid="tab-memories"]');
    const settingsTab = page.locator('[data-testid="tab-settings"]');
    
    await expect(homeTab).toBeVisible();
    await expect(chatTab).toBeVisible();
    await expect(memoriesTab).toBeVisible();
    await expect(settingsTab).toBeVisible();
    
    // Click on chat tab
    await chatTab.click();
    
    // Check if chat content is visible
    const chatContent = page.locator('[data-testid="chat-content"]');
    await expect(chatContent).toBeVisible();
  });

  test('should close drawer when clicking outside', async ({ page }) => {
    // Wait for the widget to load and open drawer
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    await page.click('[data-testid="awy-heart-button"]');
    
    // Wait for drawer to open
    await page.waitForSelector('[data-testid="awy-drawer"]');
    
    // Click outside the drawer (on backdrop)
    await page.click('[data-testid="awy-backdrop"]');
    
    // Check if drawer is closed
    const drawer = page.locator('[data-testid="awy-drawer"]');
    await expect(drawer).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for the widget to load
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    
    // Check if the heart button is still visible and properly sized
    const heartButton = page.locator('[data-testid="awy-heart-button"]');
    await expect(heartButton).toBeVisible();
    
    // Click to open drawer
    await heartButton.click();
    
    // Check if drawer adapts to mobile
    const drawer = page.locator('[data-testid="awy-drawer"]');
    await expect(drawer).toBeVisible();
    
    // On mobile, drawer should take more screen space
    const drawerBox = await drawer.boundingBox();
    expect(drawerBox?.width).toBeGreaterThan(300);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Wait for the widget to load
    await page.waitForSelector('[data-testid="awy-heart-button"]', { timeout: 10000 });
    
    // Focus the heart button using keyboard
    await page.keyboard.press('Tab');
    
    // Check if heart button is focused
    const heartButton = page.locator('[data-testid="awy-heart-button"]');
    await expect(heartButton).toBeFocused();
    
    // Press Enter to open drawer
    await page.keyboard.press('Enter');
    
    // Check if drawer opens
    const drawer = page.locator('[data-testid="awy-drawer"]');
    await expect(drawer).toBeVisible();
    
    // Press Escape to close drawer
    await page.keyboard.press('Escape');
    
    // Check if drawer closes
    await expect(drawer).not.toBeVisible();
  });
});

