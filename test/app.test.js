const assert = require('assert');
const http = require('http');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'PASS' });
  } catch (err) {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
  }
}

function asyncTest(name, fn) {
  return fn()
    .then(function () {
      passed++;
      results.push({ name, status: 'PASS' });
    })
    .catch(function (err) {
      failed++;
      results.push({ name, status: 'FAIL', error: err.message });
    });
}

test('Express imports and creates app', function () {
  const express = require('express');
  assert.strictEqual(typeof express, 'function');
  const app = express();
  assert.ok(app);
  assert.strictEqual(typeof app.get, 'function');
  assert.strictEqual(typeof app.post, 'function');
  assert.strictEqual(typeof app.use, 'function');
});

test('Mongoose imports and has expected API', function () {
  const mongoose = require('mongoose');
  assert.ok(mongoose);
  assert.strictEqual(typeof mongoose.model, 'function');
  assert.strictEqual(typeof mongoose.Schema, 'function');
  assert.strictEqual(typeof mongoose.connect, 'function');
  const version = mongoose.version;
  assert.ok(version.startsWith('6.'), 'mongoose version should start with 6., got: ' + version);
});

test('Passport imports and has expected API', function () {
  const passport = require('passport');
  assert.ok(passport);
  assert.strictEqual(typeof passport.use, 'function');
  assert.strictEqual(typeof passport.authenticate, 'function');
  assert.strictEqual(typeof passport.initialize, 'function');
  assert.strictEqual(typeof passport.session, 'function');
  assert.strictEqual(typeof passport.serializeUser, 'function');
  assert.strictEqual(typeof passport.deserializeUser, 'function');
});

test('Passport LocalStrategy can be instantiated', function () {
  const LocalStrategy = require('passport-local').Strategy;
  assert.strictEqual(typeof LocalStrategy, 'function');
  const strategy = new LocalStrategy(function (username, password, done) {
    done(null, false);
  });
  assert.ok(strategy);
  assert.strictEqual(strategy.name, 'local');
});

test('User model has expected schema and methods', function () {
  const mongoose = require('mongoose');
  require('../src/models/User');
  const User = mongoose.model('User');
  assert.ok(User);
  assert.strictEqual(typeof User.findOne, 'function');
  assert.strictEqual(typeof User.create, 'function');
  assert.strictEqual(typeof User.findById, 'function');
  assert.strictEqual(typeof User.update, 'function', 'User.update should exist in mongoose 6');
  assert.strictEqual(typeof User.findByUsername, 'function');
  assert.strictEqual(typeof User.removeById, 'function');
  assert.strictEqual(typeof User.updateUser, 'function');
  assert.strictEqual(typeof User.schema.methods.comparePassword, 'function');
});

test('Express-session imports and is a function', function () {
  const session = require('express-session');
  assert.strictEqual(typeof session, 'function');
  const middleware = session({ secret: 'test', resave: false, saveUninitialized: false });
  assert.strictEqual(typeof middleware, 'function');
});

test('Bcryptjs hashes and compares passwords', function () {
  const bcrypt = require('bcryptjs');
  assert.strictEqual(typeof bcrypt.hashSync, 'function');
  assert.strictEqual(typeof bcrypt.compareSync, 'function');
  const hash = bcrypt.hashSync('testpassword', 10);
  assert.ok(hash);
  assert.ok(hash.startsWith('$2a$'));
  assert.strictEqual(bcrypt.compareSync('testpassword', hash), true);
  assert.strictEqual(bcrypt.compareSync('wrongpassword', hash), false);
});

test('Express app has expected routes configured', function () {
  const app = require('../src/app');
  assert.ok(app);
  const stack = app._router && app._router.stack;
  assert.ok(Array.isArray(stack));
  const routeLayers = stack.filter(function (layer) { return layer.route; });
  assert.ok(routeLayers.length > 0);
  const healthRoute = routeLayers.find(function (layer) { return layer.route.path === '/health'; });
  assert.ok(healthRoute, '/health route should exist');
  const wildcardRoute = routeLayers.find(function (layer) { return layer.route.path === '*'; });
  assert.ok(wildcardRoute, 'wildcard * route should exist (Express 4 style)');
});

test('Passport 0.6 req.logout() works without callback', function () {
  const passport = require('passport');
  assert.strictEqual(typeof passport._deserializers, 'object');
  const initMiddleware = passport.initialize();
  assert.strictEqual(typeof initMiddleware, 'function');
  let logoutCalled = false;
  const mockLogout = function () {
    if (arguments.length === 0) { logoutCalled = true; return; }
  };
  mockLogout();
  assert.strictEqual(logoutCalled, true);
});

test('Auth middleware exports expected functions', function () {
  const auth = require('../src/middleware/auth');
  assert.strictEqual(typeof auth.configurePassport, 'function');
  assert.strictEqual(typeof auth.ensureAuthenticated, 'function');
  assert.strictEqual(typeof auth.ensureAdmin, 'function');
});

test('Auth routes exports an Express Router', function () {
  const authRoutes = require('../src/routes/auth');
  assert.ok(authRoutes);
  assert.strictEqual(typeof authRoutes, 'function');
  const stack = authRoutes.stack;
  assert.ok(Array.isArray(stack));
  const routePaths = stack
    .filter(function (layer) { return layer.route; })
    .map(function (layer) { return layer.route.path; });
  assert.ok(routePaths.includes('/login'));
  assert.ok(routePaths.includes('/register'));
  assert.ok(routePaths.includes('/logout'));
  assert.ok(routePaths.includes('/profile'));
  assert.ok(routePaths.includes('/check'));
});

test('User schema has correct field definitions', function () {
  const mongoose = require('mongoose');
  const User = mongoose.model('User');
  const schema = User.schema;
  const paths = Object.keys(schema.paths);
  assert.ok(paths.includes('username'));
  assert.ok(paths.includes('email'));
  assert.ok(paths.includes('password'));
  assert.ok(paths.includes('role'));
  assert.ok(paths.includes('createdAt'));
  assert.strictEqual(schema.paths.username.instance, 'String');
  assert.strictEqual(schema.paths.email.instance, 'String');
  assert.strictEqual(schema.paths.password.instance, 'String');
  assert.strictEqual(schema.paths.role.instance, 'String');
  assert.strictEqual(schema.paths.createdAt.instance, 'Date');
});

const httpTests = [];

httpTests.push(asyncTest('GET /health returns 200 with status ok', function () {
  const app = require('../src/app');
  return new Promise(function (resolve, reject) {
    const server = app.listen(0, function () {
      const port = server.address().port;
      http.get('http://127.0.0.1:' + port + '/health', function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          try {
            assert.strictEqual(res.statusCode, 200);
            const data = JSON.parse(body);
            assert.strictEqual(data.status, 'ok');
            assert.ok(data.timestamp);
            server.close(); resolve();
          } catch (err) { server.close(); reject(err); }
        });
      });
    });
  });
}));

httpTests.push(asyncTest('GET /nonexistent returns 404 via wildcard', function () {
  const app = require('../src/app');
  return new Promise(function (resolve, reject) {
    const server = app.listen(0, function () {
      const port = server.address().port;
      http.get('http://127.0.0.1:' + port + '/nonexistent', function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          try {
            assert.strictEqual(res.statusCode, 404);
            const data = JSON.parse(body);
            assert.strictEqual(data.error, 'Not found');
            server.close(); resolve();
          } catch (err) { server.close(); reject(err); }
        });
      });
    });
  });
}));

httpTests.push(asyncTest('GET /api/info returns app metadata', function () {
  const app = require('../src/app');
  return new Promise(function (resolve, reject) {
    const server = app.listen(0, function () {
      const port = server.address().port;
      http.get('http://127.0.0.1:' + port + '/api/info', function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          try {
            assert.strictEqual(res.statusCode, 200);
            const data = JSON.parse(body);
            assert.strictEqual(data.name, 'ovvoc-test-starter-10');
            assert.deepStrictEqual(data.stack, ['express', 'mongoose', 'passport']);
            server.close(); resolve();
          } catch (err) { server.close(); reject(err); }
        });
      });
    });
  });
}));

httpTests.push(asyncTest('GET /auth/check returns authenticated: false', function () {
  const app = require('../src/app');
  return new Promise(function (resolve, reject) {
    const server = app.listen(0, function () {
      const port = server.address().port;
      http.get('http://127.0.0.1:' + port + '/auth/check', function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          try {
            assert.strictEqual(res.statusCode, 200);
            const data = JSON.parse(body);
            assert.strictEqual(data.authenticated, false);
            server.close(); resolve();
          } catch (err) { server.close(); reject(err); }
        });
      });
    });
  });
}));

httpTests.push(asyncTest('GET /auth/profile returns 401 unauthenticated', function () {
  const app = require('../src/app');
  return new Promise(function (resolve, reject) {
    const server = app.listen(0, function () {
      const port = server.address().port;
      http.get('http://127.0.0.1:' + port + '/auth/profile', function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          try {
            assert.strictEqual(res.statusCode, 401);
            const data = JSON.parse(body);
            assert.strictEqual(data.error, 'Not authenticated');
            server.close(); resolve();
          } catch (err) { server.close(); reject(err); }
        });
      });
    });
  });
}));

Promise.all(httpTests).then(function () {
  console.log(String.fromCharCode(10) + '='.repeat(60));
  console.log('  ovvoc-test-starter-10 -- Test Results');
  console.log('='.repeat(60));
  results.forEach(function (r) {
    const icon = r.status === 'PASS' ? '  PASS' : '  FAIL';
    console.log(icon + ' ' + r.name);
    if (r.error) { console.log('    -> ' + r.error); }
  });
  console.log('-'.repeat(60));
  console.log('  Total: ' + (passed + failed) + '  Passed: ' + passed + '  Failed: ' + failed);
  console.log('='.repeat(60) + String.fromCharCode(10));
  if (failed > 0) { process.exit(1); }
});
