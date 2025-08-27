import { test, expect } from '@playwright/test';

test.describe('Chat Window', () => {
  test('should send and receive messages', async ({ page }) => {
    // Mock chat API
    await page.route('/api/chat/message', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      await route.fulfill({
        json: {
          AIContent: `I received your message: "${postData.userContent}"`
        }
      });
    });

    await page.goto('/');

    // Type a message
    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('Hello, can you help me?');
    
    // Send the message
    await page.click('text=Send');

    // Check that the user message appears
    await expect(page.getByText('Hello, can you help me?')).toBeVisible();

    // Check that the AI response appears
    await expect(page.getByText('I received your message: "Hello, can you help me?"')).toBeVisible();

    // Input should be cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should disable send button when input is empty', async ({ page }) => {
    await page.goto('/');

    const sendButton = page.getByText('Send');
    const chatInput = page.getByPlaceholder('Type your message...');

    // Send button should be disabled initially
    await expect(sendButton).toBeDisabled();

    // Type something
    await chatInput.fill('Test message');
    await expect(sendButton).not.toBeDisabled();

    // Clear input
    await chatInput.fill('');
    await expect(sendButton).toBeDisabled();
  });

  test('should handle mobile chat overlay', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      // Chat should be collapsed initially on mobile
      const chatInput = page.getByPlaceholder('Type your message...');
      await expect(chatInput).not.toBeVisible();

      // Click mobile chat toggle
      await page.click('[data-testid="mobile-chat-toggle"]');
      await expect(chatInput).toBeVisible();

      // Close chat overlay
      await page.click('[data-testid="close-chat"]');
      await expect(chatInput).not.toBeVisible();
    }
  });

  test('should show loading state while sending message', async ({ page }) => {
    // Mock delayed API response
    await page.route('/api/chat/message', async route => {
      // Delay response by 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        json: { AIContent: 'Response after delay' }
      });
    });

    await page.goto('/');

    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('Test message');
    await page.click('text=Send');

    // Should show loading state
    await expect(page.getByText('Sending...')).toBeVisible();

    // After response, loading should disappear
    await expect(page.getByText('Response after delay')).toBeVisible();
    await expect(page.getByText('Sending...')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/chat/message', async route => {
      await route.abort('failed');
    });

    await page.goto('/');

    const chatInput = page.getByPlaceholder('Type your message...');
    await chatInput.fill('Test message');
    await page.click('text=Send');

    // Should handle error gracefully - message should still appear in chat
    await expect(page.getByText('Test message')).toBeVisible();
  });
});