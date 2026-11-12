const Fault = require('../models/Fault');

/**
 * GET /api/faults
 * All faults, most recent first, limit 200.
 */
const getFaults = async (req, res, next) => {
  try {
    const faults = await Fault.find().sort({ first_detected: -1 }).limit(200);
    res.json({ success: true, count: faults.length, data: faults });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faults/active
 * Only active faults.
 */
const getActiveFaults = async (req, res, next) => {
  try {
    const faults = await Fault.find({ status: 'active' }).sort({ first_detected: -1 });
    res.json({ success: true, count: faults.length, data: faults });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/faults/history
 * Only recovered faults.
 */
const getFaultHistory = async (req, res, next) => {
  try {
    const faults = await Fault.find({ status: 'recovered' }).sort({ recovery_time: -1 }).limit(200);
    res.json({ success: true, count: faults.length, data: faults });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFaults,
  getActiveFaults,
  getFaultHistory,
};
