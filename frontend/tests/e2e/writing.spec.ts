import { test, expect } from '@playwright/test';

test.describe('Writing Feature', () => {
  test('should display writing list', async ({ page }) => {
    // Mock writings API
    await page.route('/api/writing', async route => {
      await route.fulfill({
        json: [
          {
            _id: '1',
            title: 'My Adventure Story',
            text: 'Once upon a time...',
            date: '2024-01-15T10:00:00Z',
            overall_score: 8
          },
          {
            _id: '2', 
            title: 'The Magic Forest',
            text: 'Deep in the forest...',
            date: '2024-01-16T10:00:00Z',
            overall_score: 9
          }
        ]
      });
    });

    await page.goto('/writing');

    // Check page title
    await expect(page.getByText('Your Amazing Stories')).toBeVisible();

    // Check writing items
    await expect(page.getByText('My Adventure Story')).toBeVisible();
    await expect(page.getByText('The Magic Forest')).toBeVisible();

    // Check scores
    await expect(page.getByText('8/10')).toBeVisible();
    await expect(page.getByText('9/10')).toBeVisible();
  });

  test('should navigate to writing detail page', async ({ page }) => {
    // Mock writings list API
    await page.route('/api/writing', async route => {
      await route.fulfill({
        json: [{
          _id: '1',
          title: 'Test Story',
          text: 'Test content...',
          date: '2024-01-15T10:00:00Z',
          overall_score: 8
        }]
      });
    });

    // Mock writing detail API
    await page.route('/api/writing/1', async route => {
      await route.fulfill({
        json: {
          _id: '1',
          title: 'Test Story',
          text: 'This is the full story content...',
          date: '2024-01-15T10:00:00Z',
          overall_score: 8,
          genre: 'Adventure',
          feedback_student: 'Great story! Keep up the good work.',
          rubric_scores: [
            {
              dimension: 'Creativity',
              criteria: [
                {
                  criterion: 'Originality',
                  score: 8,
                  reason: 'Very creative ideas'
                }
              ]
            }
          ],
          improved_text: 'This is an improved version...'
        }
      });
    });

    await page.goto('/writing');

    // Click on a story
    await page.click('text=Test Story');

    // Should navigate to detail page
    await expect(page.url()).toContain('/writing/1');

    // Check detail page content
    await expect(page.getByText('Your Original Story')).toBeVisible();
    await expect(page.getByText('This is the full story content...')).toBeVisible();
    await expect(page.getByText('Your Teacher\'s Feedback')).toBeVisible();
    await expect(page.getByText('Great story! Keep up the good work.')).toBeVisible();
    await expect(page.getByText('Improved Version')).toBeVisible();
  });

  test('should navigate back from detail page', async ({ page }) => {
    // Setup same mocks as above
    await page.route('/api/writing/1', async route => {
      await route.fulfill({
        json: {
          _id: '1',
          title: 'Test Story',
          text: 'Story content',
          date: '2024-01-15T10:00:00Z',
          overall_score: 8
        }
      });
    });

    await page.goto('/writing/1');

    // Click back button
    await page.click('text=Back to Stories');

    // Should navigate back to writing list
    await expect(page.url()).toContain('/writing');
  });

  test('should create new writing story', async ({ page }) => {
    // Mock form submission
    await page.route('/api/chat/message', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      if (postData.type === 'form' && postData.formType === 'writing') {
        await route.fulfill({
          json: {
            workflowResult: {
              overallScore: 8,
              writingId: 'new_story_id',
              feedback: 'Great work on your new story!'
            }
          }
        });
      }
    });

    await page.goto('/writing/create');

    // Fill out the form
    await page.fill('input[placeholder="Enter your story title..."]', 'My New Adventure');
    await page.fill('textarea[placeholder="Write your story here..."]', 'This is my amazing new story about adventure...');

    // Submit the form
    await page.click('text=Submit Story');

    // Should show success message or navigate to results
    await expect(page.getByText('Great work on your new story!')).toBeVisible();
  });

  test('should handle empty writing list', async ({ page }) => {
    // Mock empty response
    await page.route('/api/writing', async route => {
      await route.fulfill({
        json: []
      });
    });

    await page.goto('/writing');

    // Should show empty state
    await expect(page.getByText('No stories yet')).toBeVisible();
    await expect(page.getByText('Start writing your first story!')).toBeVisible();
  });

  test('should show writing scores with correct colors', async ({ page }) => {
    await page.route('/api/writing', async route => {
      await route.fulfill({
        json: [
          { _id: '1', title: 'High Score Story', overall_score: 9, date: '2024-01-15T10:00:00Z', text: 'test' },
          { _id: '2', title: 'Medium Score Story', overall_score: 7, date: '2024-01-15T10:00:00Z', text: 'test' },
          { _id: '3', title: 'Low Score Story', overall_score: 5, date: '2024-01-15T10:00:00Z', text: 'test' }
        ]
      });
    });

    await page.goto('/writing');

    // Check that different scores have different styling
    const highScoreElement = page.getByText('9/10').first();
    const mediumScoreElement = page.getByText('7/10').first();
    const lowScoreElement = page.getByText('5/10').first();

    await expect(highScoreElement).toBeVisible();
    await expect(mediumScoreElement).toBeVisible();
    await expect(lowScoreElement).toBeVisible();
  });
});