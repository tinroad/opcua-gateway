/**
 * Prueba simple de conexión SNMP local
 */

const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const server = dgram.createSocket('udp4');

const PORT = 8161;
const HOST = '127.0.0.1';

// Simple SNMP request packet (GetRequest for system description OID)
const requestPacket = Buffer.from([
  0x30, 0x26,             // SEQUENCE
  0x02, 0x01, 0x00,       // Version: 0 = SNMPv1
  0x04, 0x06, // Community string length
  0x70, 0x75, 0x62, 0x6c, 0x69, 0x63, // "public"
  0xa0, 0x19,             // GetRequest PDU
  0x02, 0x01, 0x01,       // Request ID: 1
  0x02, 0x01, 0x00,       // Error status: 0 (no error)
  0x02, 0x01, 0x00,       // Error index: 0
  0x30, 0x0e,             // Varbind list
  0x30, 0x0c,             // Varbind
  0x06, 0x08,             // OID
  0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00, // 1.3.6.1.2.1.1.1.0 (System Description)
  0x05, 0x00              // NULL
]);

// Set up server
server.on('listening', () => {
  const address = server.address();
  console.log(`SNMP test server listening on ${address.address}:${address.port}`);
});

server.on('message', (msg, rinfo) => {
  console.log(`Server received message from ${rinfo.address}:${rinfo.port}`);

  // Send a simple response
  const response = Buffer.from([
    0x30, 0x29,             // SEQUENCE
    0x02, 0x01, 0x00,       // Version: 0 = SNMPv1
    0x04, 0x06,             // Community string length
    0x70, 0x75, 0x62, 0x6c, 0x69, 0x63, // "public"
    0xa2, 0x1c,             // Response PDU
    0x02, 0x01, 0x01,       // Request ID: 1
    0x02, 0x01, 0x00,       // Error status: 0 (no error)
    0x02, 0x01, 0x00,       // Error index: 0
    0x30, 0x11,             // Varbind list
    0x30, 0x0f,             // Varbind
    0x06, 0x08,             // OID
    0x2b, 0x06, 0x01, 0x02, 0x01, 0x01, 0x01, 0x00, // 1.3.6.1.2.1.1.1.0
    0x04, 0x03,             // OCTET STRING
    0x4f, 0x4b, 0x21        // "OK!"
  ]);

  server.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
    if (err) {
      console.error(`Error sending response: ${err.message}`);
    } else {
      console.log('Response sent successfully');
    }
  });
});

// For error handling
server.on('error', (err) => {
  console.error(`Server error: ${err.message}`);
  server.close();
});

// Set up client
client.on('message', (msg, rinfo) => {
  console.log(`Client received response from ${rinfo.address}:${rinfo.port}`);
  console.log('Response:', msg);
  client.close();

  // Close server after successful test
  setTimeout(() => {
    console.log('Test completed successfully!');
    server.close();
  }, 1000);
});

client.on('error', (err) => {
  console.error(`Client error: ${err.message}`);
  client.close();
});

// Start server
server.bind(PORT);

// Wait a bit and then send request
setTimeout(() => {
  console.log(`Sending SNMP test request to ${HOST}:${PORT}`);
  client.send(requestPacket, 0, requestPacket.length, PORT, HOST, (err) => {
    if (err) {
      console.error(`Error sending request: ${err.message}`);
      client.close();
    } else {
      console.log('Request sent, waiting for response...');
    }
  });
}, 1000);

// Set timeout for the test
setTimeout(() => {
  console.log('Test timed out!');
  client.close();
  server.close();
  process.exit(1);
}, 5000); 