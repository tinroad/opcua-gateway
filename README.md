# OPC UA Gateway

Gateway for communication with OPC UA servers, implemented in Node.js.

## Features

- Secure connection to OPC UA servers
- REST API for value reading
- Connection pooling system
- Automatic reconnection handling
- Configurable logging
- Health monitoring endpoints
- Modular and maintainable structure
- Support for different OPC UA security policies

## Project Structure

```
project/
├── src/
│   ├── config/
│   │   └── config.js         # Centralized configuration
│   ├── services/
│   │   └── opcuaService.js   # OPC UA service
│   ├── middleware/
│   │   └── requestLogger.js  # Logging middleware
│   ├── routes/
│   │   ├── healthRoutes.js   # Health check routes
│   │   ├── configRoutes.js   # Configuration routes
│   │   └── iotgatewayRoutes.js # Main routes
│   ├── utils/
│   │   └── logger.js         # Logging configuration
│   ├── app.js               # Express application
│   └── server.js            # Entry point
├── certificates/            # OPC UA certificates (optional)
│   ├── client_cert.pem
│   ├── client_key.pem
│   ├── trusted/
│   └── rejected/
├── public/                  # Static files
├── .env                     # Environment variables
├── Dockerfile
└── docker-compose.yml
```

## Configuration

### Environment Variables

```env
# OPC UA Configuration
OPC_ENDPOINT=opc.tcp://127.0.0.1:4840
OPC_SECURITY_MODE=1
OPC_SECURITY_POLICY=None
OPC_NAMESPACE=2
OPC_APPLICATION_URI=urn:CLIENT:NodeOPCUA-Client

# OPC UA Certificate Configuration (optional, only for secure modes)
OPC_CERTIFICATE_FILE=./certificates/client_cert.pem
OPC_PRIVATE_KEY_FILE=./certificates/client_key.pem
OPC_TRUSTED_FOLDER=./certificates/trusted
OPC_REJECTED_FOLDER=./certificates/rejected

# Connection Configuration
CONNECTION_RETRY_MAX=5
CONNECTION_INITIAL_DELAY=1000
CONNECTION_MAX_RETRY=10
CONNECTION_MAX_DELAY=10000
CONNECTION_RETRY_DELAY=5000

# Server Configuration
SERVER_PORT=3000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_ERROR=error.log
LOG_FILE_COMBINED=combined.log
LOG_TO_CONSOLE=true
```

### OPC UA Security Policies

#### Security Modes (OPC_SECURITY_MODE)

- `1`: None (No security) - No certificates required
- `2`: Sign (Sign only) - Requires certificates
- `3`: SignAndEncrypt (Sign and encrypt) - Requires certificates

#### Security Policies (OPC_SECURITY_POLICY)

- `None`: No security - No certificates required
- `Basic128`: Basic policy (deprecated)
- `Basic256`: Improved basic policy (deprecated)
- `Basic256Sha256`: Recommended policy
- `Aes128_Sha256_RsaOaep`: Modern policy
- `Aes256_Sha256_RsaPss`: Most secure policy

#### Configuration Examples

1. No security (development):

```env
OPC_SECURITY_MODE=1
OPC_SECURITY_POLICY=None
# No certificates required
```

2. Sign only:

```env
OPC_SECURITY_MODE=2
OPC_SECURITY_POLICY=Basic256Sha256
# Requires certificates
OPC_CERTIFICATE_FILE=./certificates/client_cert.pem
OPC_PRIVATE_KEY_FILE=./certificates/client_key.pem
OPC_TRUSTED_FOLDER=./certificates/trusted
OPC_REJECTED_FOLDER=./certificates/rejected
```

3. Sign and encrypt (production):

```env
OPC_SECURITY_MODE=3
OPC_SECURITY_POLICY=Aes256_Sha256_RsaPss
# Requires certificates
OPC_CERTIFICATE_FILE=./certificates/client_cert.pem
OPC_PRIVATE_KEY_FILE=./certificates/client_key.pem
OPC_TRUSTED_FOLDER=./certificates/trusted
OPC_REJECTED_FOLDER=./certificates/rejected
```

### Certificate Management (Optional)

Certificates are only required when using a security mode that requires them (SecurityMode > 1).

1. Generate certificates (only if using secure mode):

```bash
# Create certificate directories
mkdir -p certificates/trusted certificates/rejected

# Generate certificates (using node-opcua-pki)
node-opcua-pki generateCertificate --subject "CN=MyClient" --outputFile certificates/client_cert.pem
```

2. Certificate structure (optional):

```
certificates/
├── client_cert.pem    # Client certificate
├── client_key.pem     # Client private key
├── trusted/           # Trusted server certificates
└── rejected/          # Rejected certificates
```

## Installation

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm start
```

## Docker

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Use docker-compose
npm run docker:compose
```

## API Endpoints

### Read OPC UA values

```http
GET /iotgateway/read?ids=<node-id>
```

#### Response

```json
{
	"readResults": [
		{
			"id": "node-id",
			"s": true,
			"r": "Good",
			"v": "value",
			"t": 1647123456789
		}
	]
}
```

### Service status

```http
GET /health
```

#### Response

```json
{
	"status": "UP",
	"opcClient": "CONNECTED",
	"opcEndpoint": "opc.tcp://127.0.0.1:4840",
	"time": 1647123456789
}
```

### Configuration (development only)

```http
GET /config
```

## Error Handling

- Automatic reconnection on connection loss
- Connection pooling for better performance
- Detailed error logging
- Centralized error handling middleware

## Security

- Support for different OPC UA security modes
- Certificate management
- Endpoint validation
- Sensitive information hiding in logs
- Security configuration through environment variables

## Requirements

- Node.js >= 14.0.0
- Accessible OPC UA server
- Valid certificates (for secure modes)

## License

MIT

## Author

Diego Morales
