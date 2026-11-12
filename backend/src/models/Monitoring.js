const mongoose = require('mongoose');

const MonitoringSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  host: {
    type: String,
    required: [true, 'Host is required'],
    index: true,
  },
  status: {
    type: String,
    enum: ['UP', 'DOWN', 'TIMEOUT'],
    required: [true, 'Status is required'],
  },
  latency: {
    type: Number,
    default: null,
  },
  packet_loss: {
    type: Number,
    default: null,
  },
  received: {
    type: Number,
  },
  tcp_status: {
    type: String,
    enum: ['OPEN', 'CLOSED', 'TIMEOUT', 'UNREACHABLE', null],
    default: null,
  },
  tcp_port: {
    type: Number,
  },
  fault: {
    type: String,
    default: 'No Fault',
  },
  tcp_fault: {
    type: String,
    default: 'No Fault',
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('Monitoring', MonitoringSchema);
