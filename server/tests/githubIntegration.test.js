const request = require('supertest');
const express = require('express');
const passport = require('passport');
const { getUserRepos, getRepoPulls, getPullFiles } = require('../services/githubService');

describe('GitHub Authentication & Integration Verification', () => {

  describe('OAuth Configuration & Status Endpoints', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use(passport.initialize());
      app.use('/api/auth', require('../routes/auth'));
    });

    it('should return configured: false when GITHUB_CLIENT_ID / SECRET are not set', async () => {
      const res = await request(app).get('/api/auth/github/status');
      expect(res.status).toBe(200);
      expect(typeof res.body.configured).toBe('boolean');
      expect(res.body.callbackUrl).toBeDefined();
    });

    it('should gracefully redirect browser navigations when OAuth is unconfigured', async () => {
      const res = await request(app)
        .get('/api/auth/github')
        .set('Accept', 'text/html');
      
      // Should redirect to frontend rather than displaying raw error JSON in window
      if (!passport._strategies || !passport._strategies.github) {
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('error=oauth_unconfigured');
      }
    });

    it('should return 400 JSON when non-HTML API client hits unconfigured OAuth', async () => {
      const res = await request(app)
        .get('/api/auth/github')
        .set('Accept', 'application/json');

      if (!passport._strategies || !passport._strategies.github) {
        expect(res.status).toBe(400);
        expect(res.body.configured).toBe(false);
        expect(res.body.message).toContain('Personal Access Token');
      }
    });
  });

  describe('User Token Isolation in GitHub API Services', () => {
    it('should pass user token in Authorization header to GitHub API', async () => {
      const testToken = 'ghp_test_token_xyz_12345';
      
      // Mock fetch
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 1, name: 'codelens-repo', owner: { login: 'octocat' } }]
      });

      const repos = await getUserRepos(testToken);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/user/repos'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`
          })
        })
      );
      expect(repos.length).toBe(1);
      expect(repos[0].name).toBe('codelens-repo');

      global.fetch = originalFetch;
    });

    it('should retrieve PRs with user-specific token header', async () => {
      const testToken = 'ghp_user_token_abc_987';
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 101, number: 42, title: 'Feature: Impact Radar', head: { ref: 'feature/radar' } }]
      });

      const pulls = await getRepoPulls(testToken, 'octocat', 'codelens');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/repos/octocat/codelens/pulls'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${testToken}`
          })
        })
      );
      expect(pulls[0].number).toBe(42);

      global.fetch = originalFetch;
    });
  });

});
