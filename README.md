[Leer en español](README.es.md)
# OPC UA Gateway

Gateway for communication with OPC UA servers, implemented in Node.js.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Secure connection to OPC UA servers
- REST API for value reading
- Connection pooling system
- Automatic reconnection handling
- Configurable logging
- Health monitoring endpoints
- Modular and maintainable structure
- Support for different OPC UA security policies
- Basic Authentication
- API Key Authentication
- Rate Limiting
- CORS Protection
- Security Headers (Helmet)

## Project Structure

```
project/
├── src/
│   ├── config/
│   │   ├── config.js         # Centralized configuration
│   │   └── corsConfig.js     # CORS configuration
│   │
│   ├── services/
│   │   └── opcuaService.js   # OPC UA service
│   ├── middleware/
│   │   ├── requestLogger.js  # Logging middleware
│   │   ├── combinedAuth.js   # Combined authentication
│   │   └── rateLimiter.js    # Rate limiting
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

# Security Configuration
API_KEY=your_api_key_here
AUTH_USERNAME=admin
AUTH_PASSWORD=your_secure_password
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
CORS_MAX_AGE=600
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Security Features

#### Authentication Methods

The gateway supports two authentication methods that can be used independently:

1. **Basic Authentication**

   - Username and password authentication
   - Credentials configured in environment variables
   - Uses standard HTTP Basic Authentication
   - Ideal for human interactions and testing
   - Example usage:
     ```bash
     # Using curl with Basic Auth
     curl -X GET "http://localhost:3000/iotgateway/read?ids=node-id" \
     -u "admin:your_secure_password"
     ```

2. **API Key Authentication**
   - Simple key-based authentication
   - API Key configured in environment variables
   - Sent via X-API-Key header
   - Ideal for machine-to-machine communication
   - Example usage:
     ```bash
     # Using curl with API Key
     curl -X GET "http://localhost:3000/iotgateway/read?ids=node-id" \
     -H "X-API-Key: your_api_key_here"
     ```

#### Rate Limiting

- Protects against abuse and DoS attacks
- Configurable limits per IP address
- Default: 100 requests per 15 minutes
- Customizable through environment variables:
  - `RATE_LIMIT_WINDOW_MS`: Time window in milliseconds
  - `RATE_LIMIT_MAX`: Maximum requests per window

#### CORS Protection

- Configurable allowed origins
- Secure headers with Helmet
- Credentials support
- Configuration options:
  - `ALLOWED_ORIGINS`: Comma-separated list of allowed domains
  - `CORS_MAX_AGE`: Options preflight cache duration

#### API Security

- All endpoints under `/iotgateway` require authentication
- Health check endpoint remains public
- Configuration endpoints only available in development
- Automatic blocking of unauthorized requests
- Detailed security logging

## API Endpoints

### Read OPC UA values

```http
GET /iotgateway/read?ids=<node-id>
```

Authentication options:

1. Using API Key:

```http
GET /iotgateway/read?ids=<node-id>
X-API-Key: your_api_key_here
```

2. Using Basic Auth:

```http
GET /iotgateway/read?ids=<node-id>
Authorization: Basic base64(username:password)
```

#### Request Parameters

- `ids`: Node ID or comma-separated list of Node IDs to read

#### Response Format

```json
{
	"readResults": [
		{
			"id": "node-id", // The requested Node ID
			"s": true, // Success flag
			"r": "Good", // Read status
			"v": "value", // The actual value
			"t": 1647123456789 // Timestamp
		}
	]
}
```

#### Error Responses

1. Authentication Failed:

```json
{
	"error": "Authentication required (Basic Auth or API Key)"
}
```

2. Invalid Credentials:

```json
{
	"error": "Invalid authentication credentials"
}
```

3. Rate Limit Exceeded:

```json
{
	"error": "Too many requests from this IP, please try again later"
}
```

### Health Check

```http
GET /health
```

No authentication required for this endpoint.

#### Response

```json
{
	"status": "UP",
	"opcClient": "CONNECTED",
	"opcEndpoint": "opc.tcp://127.0.0.1:4840",
	"time": 1647123456789
}
```

## Error Handling

- Automatic reconnection on connection loss
- Connection pooling for better performance
- Detailed error logging with timestamps
- Centralized error handling middleware
- Rate limit exceeded handling
- Authentication error handling
- Graceful error responses

## Security Best Practices

1. **Authentication**

   - Use strong passwords for Basic Auth
   - Generate secure random API keys
   - Rotate API keys periodically
   - Use HTTPS in production

2. **Configuration**

   - Never commit .env files
   - Use different credentials for development and production
   - Regularly update security dependencies
   - Monitor security logs

3. **Network Security**
   - Configure allowed origins carefully
   - Use rate limiting appropriate for your use case
   - Enable HTTPS in production
   - Regular security audits

## Requirements

- Node.js >= 14.0.0
- Accessible OPC UA server
- Valid certificates (for secure modes)
- Secure API key
- Basic Auth credentials
- HTTPS certificate (recommended for production)

## Installation and Deployment

### Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Production Deployment

```bash
# Install dependencies
npm install --production

# Set up environment variables
# Make sure to use secure credentials!

# Start production server
npm start
```

### Docker Deployment

```bash
# Build image
docker build -t opcua-gateway .

# Run container
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  opcua-gateway

# Using docker-compose
docker-compose up -d
```

## Code of Conduct

Please note that this project has a [Code of Conduct](CODE_OF_CONDUCT.md).
By participating in this project, you agree to abide by its terms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Diego Morales
