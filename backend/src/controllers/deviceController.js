const Device = require("../models/Device");

/**
 * GET /api/devices
 * List all devices.
 */
const getDevices = async (req, res, next) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json({ success: true, count: devices.length, data: devices });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/devices/:id
 * Get one device by MongoDB _id.
 */
const getDeviceById = async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }
    res.json({ success: true, data: device });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, error: "Invalid device ID format" });
    }
    next(err);
  }
};

/**
 * POST /api/devices
 * Create a new device.
 */
const createDevice = async (req, res, next) => {
  try {
    const { name, host, type, tcp_port } = req.body;

    if (!name || !host || !type || tcp_port === undefined) {
      return res.status(400).json({
        success: false,
        error: "name, host, type, and tcp_port are required",
      });
    }

    const portNum = Number(tcp_port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({
        success: false,
        error: "tcp_port must be an integer between 1 and 65535",
      });
    }

    const device = await Device.create({
      name: name.trim(),
      host: host.trim(),
      type: type.trim(),
      tcp_port: portNum,
    });
    res.status(201).json({ success: true, data: device });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A device with that host already exists" });
    }
    next(err);
  }
};

/**
 * PUT /api/devices/:id
 * Update a device.
 */
const updateDevice = async (req, res, next) => {
  try {
    if (req.body.tcp_port !== undefined) {
      const portNum = Number(req.body.tcp_port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        return res.status(400).json({
          success: false,
          error: "tcp_port must be an integer between 1 and 65535",
        });
      }
      req.body.tcp_port = portNum;
    }

    if (req.body.name) req.body.name = req.body.name.trim();
    if (req.body.host) req.body.host = req.body.host.trim();
    if (req.body.type) req.body.type = req.body.type.trim();

    const device = await Device.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }
    res.json({ success: true, data: device });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, error: "Invalid device ID format" });
    }
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "A device with that host already exists" });
    }
    next(err);
  }
};

/**
 * DELETE /api/devices/:id
 * Delete a device.
 */
const deleteDevice = async (req, res, next) => {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, error: "Device not found" });
    }
    res.json({ success: true, data: {} });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ success: false, error: "Invalid device ID format" });
    }
    next(err);
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
};

