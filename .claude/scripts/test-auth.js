/**
 * Authentication Test Utilities
 *
 * Provides helper functions for testing authenticated endpoints
 * Usage: const { getAuthToken, makeAuthRequest } = require('./.claude/scripts/test-auth');
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * Get authentication token for testing
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} JWT token
 */
async function getAuthToken(email = 'test@example.com', password = 'password') {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Auth failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Create authentication headers
 * @param {string} token - JWT token
 * @returns {Object} Headers object
 */
function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Make authenticated request
 * @param {string} endpoint - API endpoint (e.g., '/api/users')
 * @param {Object} options - Fetch options
 * @param {string} token - JWT token (optional, will fetch if not provided)
 * @returns {Promise<Response>}
 */
async function makeAuthRequest(endpoint, options = {}, token = null) {
  if (!token) {
    token = await getAuthToken();
  }

  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...createAuthHeaders(token),
      ...options.headers,
    },
  });
}

/**
 * Create test user for authentication tests
 * @returns {Promise<Object>} User object with credentials
 */
async function createTestUser() {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User',
  };

  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });

  if (!response.ok) {
    throw new Error(`Failed to create test user: ${response.statusText}`);
  }

  return testUser;
}

module.exports = {
  getAuthToken,
  createAuthHeaders,
  makeAuthRequest,
  createTestUser,
};
