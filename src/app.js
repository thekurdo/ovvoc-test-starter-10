const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { configurePassport } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware (express-session 1.x)
app.use(
  session({
    secret: 'ovvoc-test-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Initialize Passport
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Health check
app.get('/health', function (req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/auth', authRoutes);

// API info route
app.get('/api/info', function (req, res) {
  res.json({
    name: 'ovvoc-test-starter-10',
    version: '1.0.0',
    stack: ['express', 'mongoose', 'passport']
  });
});

// Express 4 wildcard route — catches everything not matched above
// In Express 5, wildcard '*' must become '{*path}' (path-to-regexp v8 change)
app.get('{*path}', function (req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use(function (err, req, res, _next) {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if run directly (not imported for tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, function () {
    console.log('Server running on port ' + PORT);
  });
}

module.exports = app;
