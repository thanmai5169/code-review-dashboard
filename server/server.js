require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const connectDB = require('./config/db');
const { initSocket } = require('./socket/reviewSocket');

// Connect to Database
connectDB();

// Initialize Cron Jobs
const initCronJobs = require('./services/cronService');
initCronJobs();

// Initialize Passport Strategies
require('./config/passport');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Allows Monaco Editor and client bundle inline web workers
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration - Dynamic Origin Resolution
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // 1500 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Express body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Passport
app.use(passport.initialize());

// Expose avatars / uploads path statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'CodeLens Intelligent Code Review Platform'
  });
});

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reviews/versions', require('./routes/versions'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/workspaces', require('./routes/knowledge'));
app.use('/api/workspaces', require('./routes/workspace'));
app.use('/api/history', require('./routes/history'));
app.use('/api/export', require('./routes/export'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/github', require('./routes/github'));
app.use('/api/v1', require('./routes/apiV1'));

// --- Serve React Client (Production Build) ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'CodeLens MERN backend server is running in development mode.',
      docs: '/api/v1/review'
    });
  });

  // In development, redirect any non-API browser navigation to the Vite dev server
  app.get('*', (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}${req.originalUrl}`);
  });
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.message || err);
  const statusCode = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CodeLens Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

module.exports = { app, server };
