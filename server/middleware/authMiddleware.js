const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check for CodeLens API Key (for CI/CD endpoints)
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (apiKey) {
    try {
      const user = await User.findOne({ 'apiKeys.codelensApiKey': apiKey });
      if (!user) {
        return res.status(401).json({ message: 'Not authorized, invalid API Key' });
      }
      req.user = user;
      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Server authentication error' });
    }
  }

  // 2. Extract JWT token from Authorization header or Query params
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.Authorization && req.query.Authorization.startsWith('Bearer')) {
    token = req.query.Authorization.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_sign_key_for_codelens_321');
      req.user = await User.findById(decoded.id).select('-passwordHash');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token or API key' });
};

module.exports = { protect };
