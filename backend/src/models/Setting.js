const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: "default",
  },
  latency_threshold: {
    type: Number,
    required: [true, "Latency threshold is required"],
    min: [1, "Latency threshold must be greater than 0"],
    default: 200,
  },
  packet_loss_threshold: {
    type: Number,
    required: [true, "Packet loss threshold is required"],
    min: [0, "Packet loss threshold must be at least 0"],
    max: [100, "Packet loss threshold cannot exceed 100"],
    default: 20,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Setting", SettingSchema);

