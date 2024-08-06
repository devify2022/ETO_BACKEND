import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isDriver: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

export default User;
