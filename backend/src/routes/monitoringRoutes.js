const express = require('express');
const router = express.Router();

const validateMonitoring = require('../middleware/validateMonitoring');
const {
  createMonitoring,
  getMonitoring,
  getChartData,
  getLatestMonitoring,
  getMonitoringByHost,
  getHostAnalytics,
} = require('../controllers/monitoringController');

// NOTE: named routes (/latest, /chart) must come before /:host to avoid route conflict
router.get('/latest', getLatestMonitoring);
router.get('/chart', getChartData);
router.get('/:host/analytics', getHostAnalytics);
router.get('/:host', getMonitoringByHost);
router.get('/', getMonitoring);
router.post('/', validateMonitoring, createMonitoring);

module.exports = router;
