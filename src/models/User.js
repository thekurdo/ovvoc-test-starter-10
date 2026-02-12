const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method: compare password (bcryptjs pattern)
userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Static method: find by username using callback pattern (mongoose 6 style)
userSchema.statics.findByUsername = function (username, cb) {
  // Mongoose 6 still supports callback-style findOne
  return this.findOne({ username: username }, cb);
};

// Static method: remove user by id — uses deprecated remove() in mongoose 6
// In mongoose 7+, remove() is dropped in favor of deleteOne()/deleteMany()
userSchema.statics.removeById = function (id, cb) {
  return this.findById(id, function (err, user) {
    if (err) return cb(err);
    if (!user) return cb(new Error('User not found'));
    // remove() is deprecated in mongoose 7, but works in 6
    user.remove(cb);
  });
};

// Static method: update user using update() with callback
// update() is deprecated in mongoose 6 (removed in 7), use updateOne() instead
userSchema.statics.updateUser = function (id, data, cb) {
  return this.update({ _id: id }, { $set: data }, cb);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
