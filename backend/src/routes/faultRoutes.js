const express = require('express');
const router = express.Router();

const {
  getFaults,
  getActiveFaults,
  getFaultHistory,
} = require('../controllers/faultController');

// NOTE: /active and /history must come before potential /:id routes
router.get('/active', getActiveFaults);
router.get('/history', getFaultHistory);
router.get('/', getFaults);

module.exports = router;
