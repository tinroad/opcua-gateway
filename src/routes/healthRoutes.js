const express = require('express');
const router = express.Router();
const opcuaService = require('../services/opcuaService');
const CONFIG = require('../config/config');

router.get('/health', (req, res) => {
  res.send({
    status: "UP",
    opcClient: opcuaService.clientPool ? "CONNECTED" : "DISCONNECTED",
    opcEndpoint: CONFIG.OPC_ENDPOINT,
    time: Date.now()
  });
});

module.exports = router; 