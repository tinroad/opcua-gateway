const express = require('express');
const router = express.Router();
const opcuaService = require('../services/opcuaService');
const logger = require('../utils/logger');

// Read OPC UA node value by nodeId in path
router.get('/nodes/:nodeId/read', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const value = await opcuaService.readOPC(nodeId);
    res.json({ nodeId, value });
  } catch (error) {
    logger.error(`Error reading OPC UA node: ${error.message}`);
    res.status(500).json({
      error: 'Failed to read OPC UA node',
      message: error.message
    });
  }
});

// Read OPC UA node value by nodeId in body
router.post('/read', async (req, res) => {
  try {
    const { namespace, nodeId } = req.body;
    if (!namespace || !nodeId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'namespace and nodeId are required in request body'
      });
    }
    const fullNodeId = `ns=${namespace};s=${nodeId}`;
    const value = await opcuaService.readOPC(fullNodeId);
    res.json({ nodeId: fullNodeId, value });
  } catch (error) {
    logger.error(`Error reading OPC UA node: ${error.message}`);
    res.status(500).json({
      error: 'Failed to read OPC UA node',
      message: error.message
    });
  }
});

// Write value to OPC UA node
router.post('/write/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Value is required in request body'
      });
    }

    await opcuaService.writeOPC(nodeId, value);
    res.json({ nodeId, message: 'Value written successfully' });
  } catch (error) {
    logger.error(`Error writing to OPC UA node: ${error.message}`);
    res.status(500).json({
      error: 'Failed to write to OPC UA node',
      message: error.message
    });
  }
});

// Get OPC UA connection status
router.get('/status', (req, res) => {
  const status = opcuaService.getConnectionStatus();
  res.json(status);
});

module.exports = router; 