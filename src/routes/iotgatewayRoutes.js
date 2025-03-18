const express = require('express');
const router = express.Router();
const opcuaService = require('../services/opcuaService');
const logger = require('../utils/logger');

router.get('/read', async (req, res) => {
  try {
    const ids = req.query.ids;

    if (!ids) {
      logger.warn('Read request without specified ID');
      return res.status(400).send({ error: 'ID is required' });
    }

    logger.info(`Processing read request for ID: ${ids}`);

    let opcResponse = await opcuaService.readOPC(ids);
    if (opcResponse === false) {
      logger.warn(`Error reading OPC UA value for ID: ${ids}`);
      return res.send({
        "readResults": [
          {
            "id": ids,
            "s": false,
            "r": "Error reading OPC UA value",
            "v": null,
            "t": Date.now()
          }
        ]
      });
    }

    const status = opcResponse.statusCode.name === 'Good';
    const response = {
      "readResults": [
        {
          "id": ids,
          "s": status,
          "r": opcResponse.statusCode.name,
          "v": opcResponse.value ? opcResponse.value.value : null,
          "t": Date.now()
        }
      ]
    };

    logger.info(`Response sent for ID ${ids} with status: ${status}`);
    res.send(response);
  } catch (error) {
    logger.error(`Error in /iotgateway/read endpoint: ${error.message}`);
    res.status(500).send({
      "readResults": [
        {
          "id": req.query.ids || "unknown",
          "s": false,
          "r": `Internal error: ${error.message}`,
          "v": null,
          "t": Date.now()
        }
      ]
    });
  }
});

// Write endpoint
router.post('/write', async (req, res) => {
  try {
    const writeData = req.body;

    // Basic validation
    if (!writeData || !Array.isArray(writeData)) {
      return res.status(400).json({
        error: "The request body must be an array of values to write"
      });
    }

    // Validate structure of each element
    for (const item of writeData) {
      if (!item.id || !('value' in item)) {
        return res.status(400).json({
          error: "Each element must have 'id' and 'value'"
        });
      }
    }

    const writeResults = await opcuaService.writeValues(writeData);

    res.json({ writeResults });
  } catch (error) {
    logger.error('Error in write operation:', error);
    res.status(500).json({
      error: "Error processing write operation"
    });
  }
});

module.exports = router; 