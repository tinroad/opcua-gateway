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

module.exports = router; 