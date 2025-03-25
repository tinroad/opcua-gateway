/**
 * Routes to access system metrics
 */

const express = require('express');
const router = express.Router();
const metrics = require('../utils/metrics');
const combinedAuth = require('../middleware/combinedAuth');

// Apply authentication to all metrics routes
router.use(combinedAuth);

// Get all metrics
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    data: metrics.getAllMetrics()
  });
});

// Get OPC UA metrics
router.get('/opcua', (req, res) => {
  res.json({
    status: 'success',
    data: metrics.getOpcuaMetrics()
  });
});

// Get HTTP metrics
router.get('/http', (req, res) => {
  res.json({
    status: 'success',
    data: metrics.getHttpMetrics()
  });
});

// Get system metrics
router.get('/system', (req, res) => {
  res.json({
    status: 'success',
    data: metrics.getSystemMetrics()
  });
});

module.exports = router; 