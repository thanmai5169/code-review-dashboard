const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const clientID = (process.env.GITHUB_CLIENT_ID || '').trim();
const clientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();
const callbackURL = (process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback').trim();

const isGitHubConfigured = Boolean(
  clientID && 
  clientSecret && 
  clientID !== 'dummy_id' && 
  clientSecret !== 'dummy_secret' &&
  !clientID.includes('your_github_client_id') &&
  !clientSecret.includes('your_github_client_secret')
);

if (isGitHubConfigured) {
  passport.use(new GitHubStrategy({
    clientID,
    clientSecret,
    callbackURL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if linking to an existing authenticated user session via state token
      const stateToken = req.query?.state;
      if (stateToken) {
        try {
          const decoded = jwt.verify(stateToken, process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_codelens_321');
          if (decoded && decoded.id) {
            const existingUser = await User.findById(decoded.id);
            if (existingUser) {
              existingUser.githubId = profile.id.toString();
              existingUser.githubUsername = profile.username || profile.login || '';
              existingUser.githubAccessToken = accessToken;
              if (profile._json?.avatar_url && (!existingUser.avatar || existingUser.avatar.startsWith('https://api.dicebear.com'))) {
                existingUser.avatar = profile._json.avatar_url;
              }
              await existingUser.save();
              return done(null, existingUser);
            }
          }
        } catch (tokenErr) {
          console.warn('OAuth state token verification bypassed or expired:', tokenErr.message);
        }
      }

      // 2. Lookup existing user by githubId
      let user = await User.findOne({ githubId: profile.id.toString() });

      if (user) {
        user.githubAccessToken = accessToken;
        user.githubUsername = profile.username || profile.login || user.githubUsername;
        if (profile._json?.avatar_url && (!user.avatar || user.avatar.startsWith('https://api.dicebear.com'))) {
          user.avatar = profile._json.avatar_url;
        }
        await user.save();
        return done(null, user);
      }

      // 3. Lookup user by email
      const primaryEmail = (profile.emails && profile.emails[0] && profile.emails[0].value)
        ? profile.emails[0].value
        : (profile.username ? `${profile.username}@github.com` : `github_${profile.id}@codelens.io`);

      user = await User.findOne({ email: primaryEmail });

      if (user) {
        user.githubId = profile.id.toString();
        user.githubUsername = profile.username || profile.login || '';
        user.githubAccessToken = accessToken;
        if (profile._json?.avatar_url && (!user.avatar || user.avatar.startsWith('https://api.dicebear.com'))) {
          user.avatar = profile._json.avatar_url;
        }
        await user.save();
        return done(null, user);
      }

      // 4. Create new user if not found
      user = await User.create({
        name: profile.displayName || profile.username || `Developer ${profile.id}`,
        email: primaryEmail,
        githubId: profile.id.toString(),
        githubUsername: profile.username || profile.login || '',
        githubAccessToken: accessToken,
        avatar: profile._json?.avatar_url || '',
        defaultLanguage: 'javascript'
      });

      return done(null, user);
    } catch (error) {
      console.error('GitHub Passport strategy error:', error);
      return done(error, null);
    }
  }));
  console.log('✅ GitHub OAuth Strategy successfully initialized with callback:', callbackURL);
} else {
  console.log('ℹ️ GitHub OAuth Credentials not configured. Personal Access Token (PAT) connection active.');
}

module.exports = {
  isGitHubConfigured,
  callbackURL
};
