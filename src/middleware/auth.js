const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

/**
 * Configure Passport with Local Strategy
 * Uses callback-based findOne (mongoose 6 style)
 */
function configurePassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      function (username, password, done) {
        // Callback-style findOne — works in mongoose 6
        User.findOne({ username: username }, function (err, user) {
          if (err) return done(err);
          if (!user) {
            return done(null, false, { message: 'Unknown user' });
          }
          user.comparePassword(password, function (err, isMatch) {
            if (err) return done(err);
            if (!isMatch) {
              return done(null, false, { message: 'Invalid password' });
            }
            return done(null, user);
          });
        });
      }
    )
  );

  // Serialize: store user id in session
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  // Deserialize: look up user by id (callback pattern)
  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });
}

/**
 * Middleware: ensure user is authenticated
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
}

/**
 * Middleware: ensure user is admin
 */
function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Forbidden' });
}

module.exports = { configurePassport, ensureAuthenticated, ensureAdmin };
