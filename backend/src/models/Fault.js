const mongoose = require('mongoose');

const FaultSchema = new mongoose.Schema({
  host: {
    type: String,
    required: [true, 'Host is required'],
    index: true,
  },
  name: {
    type: String,
  },
  fault_type: {
    type: String,
    required: [true, 'Fault type is required'],
  },
  description: {
    type: String,
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: [true, 'Severity is required'],
  },
  first_detected: {
    type: Date,
    default: Date.now,
  },
  recovery_time: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'recovered'],
    default: 'active',
  },
});

module.exports = mongoose.model('Fault', FaultSchema);
