const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
  },
  host: {
    type: String,
    required: [true, 'Host is required'],
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Device type is required'],
    trim: true,
  },
  tcp_port: {
    type: Number,
    required: [true, 'TCP port is required'],
    min: [1, 'Port must be >= 1'],
    max: [65535, 'Port must be <= 65535'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Device', DeviceSchema);
