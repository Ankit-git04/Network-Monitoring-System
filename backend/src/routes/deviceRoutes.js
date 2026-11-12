const express = require('express');
const router = express.Router();

const {
  getDevices,
  getDeviceById,
  getDeviceStats,
  createDevice,
  updateDevice,
  deleteDevice,
} = require('../controllers/deviceController');

// NOTE: /stats must come before /:id to avoid route conflict
router.get('/stats', getDeviceStats);
router.get('/', getDevices);
router.get('/:id', getDeviceById);
router.post('/', createDevice);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);

module.exports = router;
