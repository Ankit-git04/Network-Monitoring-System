const fs = require("fs");
const path = require("path");
const Setting = require("../models/Setting");

/**
 * Get current system monitoring thresholds.
 */
const getSettings = async (req, res, next) => {
  try {
    let setting = await Setting.findOne({ key: "default" });

    if (!setting) {
      // Initialize from config/settings.json if available
      let defaultLatency = 200;
      let defaultLoss = 20;

      try {
        const configPath = path.resolve(__dirname, "../../../config/settings.json");
        if (fs.existsSync(configPath)) {
          const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
          if (raw.latency_threshold) defaultLatency = raw.latency_threshold;
          if (raw.packet_loss_threshold !== undefined) defaultLoss = raw.packet_loss_threshold;
        }
      } catch (err) {
        console.warn("Could not read config/settings.json:", err.message);
      }

      setting = await Setting.create({
        key: "default",
        latency_threshold: defaultLatency,
        packet_loss_threshold: defaultLoss,
      });
    }

    res.json({
      success: true,
      data: {
        latency_threshold: setting.latency_threshold,
        packet_loss_threshold: setting.packet_loss_threshold,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update monitoring thresholds.
 */
const updateSettings = async (req, res, next) => {
  try {
    const { latency_threshold, packet_loss_threshold } = req.body;

    if (latency_threshold === undefined && packet_loss_threshold === undefined) {
      return res.status(400).json({
        success: false,
        error: "latency_threshold or packet_loss_threshold must be provided",
      });
    }

    const updates = { updatedAt: new Date() };

    if (latency_threshold !== undefined) {
      const lat = Number(latency_threshold);
      if (isNaN(lat) || lat <= 0) {
        return res.status(400).json({
          success: false,
          error: "latency_threshold must be a number greater than 0",
        });
      }
      updates.latency_threshold = lat;
    }

    if (packet_loss_threshold !== undefined) {
      const loss = Number(packet_loss_threshold);
      if (isNaN(loss) || loss < 0 || loss > 100) {
        return res.status(400).json({
          success: false,
          error: "packet_loss_threshold must be a number between 0 and 100",
        });
      }
      updates.packet_loss_threshold = loss;
    }

    const setting = await Setting.findOneAndUpdate(
      { key: "default" },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      data: {
        latency_threshold: setting.latency_threshold,
        packet_loss_threshold: setting.packet_loss_threshold,
        updatedAt: setting.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};

