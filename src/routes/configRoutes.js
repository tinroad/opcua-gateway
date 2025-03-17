const express = require('express');
const router = express.Router();
const CONFIG = require('../config/config');

router.get('/config', (req, res) => {
  res.send({
    ...CONFIG,
    // Hide sensitive information
    OPC_ENDPOINT: CONFIG.OPC_ENDPOINT.replace(/\/\/(.+)@/, '//*****@')
  });
});

module.exports = router; 