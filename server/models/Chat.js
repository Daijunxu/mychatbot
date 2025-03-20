import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

chatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat = mongoose.model('Chat', chatSchema); 