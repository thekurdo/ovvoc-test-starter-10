const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /auth/login
 * Authenticate using passport local strategy
 */
router.post('/login', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info.message || 'Login failed' });
    }
    req.logIn(user, function (err) {
      if (err) return next(err);
      return res.json({ message: 'Logged in', user: { id: user.id, username: user.username } });
    });
  })(req, res, next);
});

/**
 * POST /auth/register
 * Create a new user with User.create() — mongoose 6 style
 */
router.post('/register', function (req, res, next) {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // User.create() with callback — mongoose 6 supports this
  User.create({ username, email, password }, function (err, user) {
    if (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      return next(err);
    }
    // Auto-login after registration
    req.logIn(user, function (err) {
      if (err) return next(err);
      res.status(201).json({
        message: 'Registered',
        user: { id: user.id, username: user.username, email: user.email }
      });
    });
  });
});

/**
 * POST /auth/logout
 * Passport 0.6 style: req.logout() works WITHOUT a callback
 * In passport 0.7+, req.logout() requires a callback: req.logout(function(err) {...})
 */
router.post('/logout', function (req, res) {
  // Passport 0.6: synchronous logout — no callback needed
  req.logout();
  req.session.destroy(function (err) {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

/**
 * GET /auth/profile
 * Returns the authenticated user's profile
 */
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt
    }
  });
});

/**
 * GET /auth/check
 * Check if user is currently authenticated
 */
router.get('/check', function (req, res) {
  res.json({ authenticated: req.isAuthenticated() });
});

module.exports = router;
