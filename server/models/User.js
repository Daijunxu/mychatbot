import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // 只有非 Google 登录用户需要密码
    }
  },
  name: String,
  picture: String,
  googleId: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// 验证密码
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema); 