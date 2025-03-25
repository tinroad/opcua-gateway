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
- SNMP Monitoring for metrics collection

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

# SNMP Configuration
ENABLE_SNMP=true
SNMP_PORT=161
SNMP_VERSION=3
SNMP_COMMUNITY=public
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

### Metrics & Monitoring

The gateway includes a comprehensive monitoring system that exposes metrics via:

1. **REST API**: Access metrics through authenticated endpoints at `/api/metrics`

   - `/api/metrics` - All metrics
   - `/api/metrics/opcua` - OPC UA specific metrics
   - `/api/metrics/http` - HTTP request metrics
   - `/api/metrics/system` - System metrics (CPU, memory, etc.)

2. **SNMP**: Monitor the gateway remotely using SNMP compatible tools like Zabbix.

   When enabled, the gateway exposes metrics via SNMP on the configured port (default: 161).
   The gateway uses the enterprise OID `1.3.6.1.4.1.12345` and organizes metrics as follows:

   - OPC UA Metrics: `1.3.6.1.4.1.12345.1.1.*`
   - HTTP Metrics: `1.3.6.1.4.1.12345.1.2.*`
   - System Metrics: `1.3.6.1.4.1.12345.1.3.*`

   For detailed OID mapping, check the application logs at startup when SNMP is enabled.

#### Available Metrics

**OPC UA Metrics:**

- Number of active connections
- Error counts
- Reconnection attempts
- Request counts
- Read/write operation counts
- Response times

**HTTP Metrics:**

- Request counts by status code
- Error rates
- Response times
- Rate limit hits

**System Metrics:**

- CPU usage
- Memory utilization
- Uptime

#### Setting up with Zabbix

1. Add the gateway as an SNMP host in Zabbix
2. Configure SNMP community string to match `SNMP_COMMUNITY` environment variable
3. Import the template or create items for each OID of interest

Enabling SNMP monitoring requires setting `ENABLE_SNMP=true` in your environment configuration.

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

### Write OPC UA values

```http
POST /iotgateway/write
Content-Type: application/json
X-API-Key: your_api_key_here
```

#### Request Body

```json
[
	{
		"id": "node-id",
		"value": "new-value"
	}
]
```

#### Response Format

```json
{
	"writeResults": [
		{
			"id": "node-id",
			"success": true,
			"message": "Value written successfully"
		}
	]
}
```

### Direct OPC UA Node Reading

```http
GET /api/opcua/read/:nodeId
```

#### Response Format

```json
{
	"nodeId": "ns=2;s=MyVariable",
	"value": "value-data"
}
```

### Direct OPC UA Node Writing

```http
POST /api/opcua/write/:nodeId
Content-Type: application/json
```

#### Request Body

```json
{
	"value": "new-value"
}
```

#### Response Format

```json
{
	"nodeId": "ns=2;s=MyVariable",
	"message": "Value written successfully"
}
```

### OPC UA Connection Status

```http
GET /api/opcua/status
```

#### Response Format

```json
{
	"connected": true,
	"endpoint": "opc.tcp://127.0.0.1:4840",
	"lastConnection": "2023-03-15T14:30:45.123Z"
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

### Configuration (Development Only)

```http
GET /config
```

Available only in development mode.

#### Response

```json
{
	"OPC_ENDPOINT": "opc.tcp://*****@127.0.0.1:4840",
	"SERVER_PORT": 3000,
	"LOG_LEVEL": "info"
	// Other configuration values (sensitive information hidden)
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

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This allows us to automatically generate changelogs and determine the next version.

The format for commit messages is:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Where `<type>` is one of:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes to the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit
- **config**: Changes to configuration files

For more details, please check the [CONTRIBUTING.md](CONTRIBUTING.md) file.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Diego Morales

# Configuración del Agente SNMP

El gateway OPC UA incluye un agente SNMP que permite monitorizar su estado a través de herramientas de monitorización como Zabbix, Nagios o cualquier otra herramienta compatible con SNMP.

## Activación del Agente SNMP

Para activar el agente SNMP, establece la variable de entorno `ENABLE_SNMP=true` en tu archivo `.env`.

## Configuración SNMP

El agente SNMP puede funcionar en tres modos diferentes según la versión de SNMP que se configure:

### Variables de entorno comunes

```
# Habilitar SNMP
ENABLE_SNMP=true

# Puerto del agente SNMP (por defecto: 161)
SNMP_PORT=161

# Versión SNMP: 1, 2c o 3 (por defecto: 1)
SNMP_VERSION=3
```

### Configuración para SNMPv1/v2c

Si utilizas SNMPv1 o SNMPv2c, solo necesitas configurar la comunidad SNMP:

```
SNMP_VERSION=2c
SNMP_COMMUNITY=public
```

### Configuración para SNMPv3 (recomendado para producción)

SNMPv3 proporciona características de seguridad adicionales, como autenticación y encriptación. Para configurar SNMPv3:

```
SNMP_VERSION=3

# Usuario principal
SNMP_SECURITY_NAME=opcgwuser
SNMP_SECURITY_LEVEL=authPriv
SNMP_AUTH_PROTOCOL=SHA256
SNMP_AUTH_KEY=opcgw_auth_key
SNMP_PRIV_PROTOCOL=AES128
SNMP_PRIV_KEY=opcgw_priv_key
```

Donde:

- `SNMP_SECURITY_NAME`: Nombre de usuario SNMPv3
- `SNMP_SECURITY_LEVEL`: Nivel de seguridad (noAuthNoPriv, authNoPriv, authPriv)
- `SNMP_AUTH_PROTOCOL`: Protocolo de autenticación (MD5, SHA1, SHA224, SHA256, SHA384, SHA512)
- `SNMP_AUTH_KEY`: Contraseña de autenticación (mínimo 8 caracteres)
- `SNMP_PRIV_PROTOCOL`: Protocolo de privacidad/encriptación (DES, AES128, AES192, AES256, AES192C, AES256C)
- `SNMP_PRIV_KEY`: Contraseña de privacidad (mínimo 8 caracteres)

#### Usuario adicional (opcional)

También puedes configurar un segundo usuario SNMPv3:

```
SNMP_USER_2_NAME=zabbix
SNMP_USER_2_LEVEL=authPriv
SNMP_USER_2_AUTH_PROTOCOL=SHA1
SNMP_USER_2_AUTH_KEY=zabbix_auth_key
SNMP_USER_2_PRIV_PROTOCOL=AES256
SNMP_USER_2_PRIV_KEY=zabbix_priv_key
```

## Métricas disponibles

El agente SNMP expone las siguientes métricas:

### OPC UA

- `1.3.6.1.4.1.12345.1.1.1` - Número de conexiones OPC UA
- `1.3.6.1.4.1.12345.1.1.2` - Número de errores OPC UA
- `1.3.6.1.4.1.12345.1.1.3` - Número de reconexiones OPC UA
- `1.3.6.1.4.1.12345.1.1.4` - Número de solicitudes OPC UA
- `1.3.6.1.4.1.12345.1.1.5` - Número de errores en solicitudes OPC UA
- `1.3.6.1.4.1.12345.1.1.6` - Número de operaciones de lectura OPC UA
- `1.3.6.1.4.1.12345.1.1.7` - Número de operaciones de escritura OPC UA
- `1.3.6.1.4.1.12345.1.1.8` - Último tiempo de respuesta OPC UA (ms)
- `1.3.6.1.4.1.12345.1.1.9` - Tiempo de respuesta promedio OPC UA (ms)

### HTTP

- `1.3.6.1.4.1.12345.1.2.1` - Número de solicitudes HTTP
- `1.3.6.1.4.1.12345.1.2.2` - Número de errores HTTP
- `1.3.6.1.4.1.12345.1.2.3` - Número de respuestas HTTP 2xx
- `1.3.6.1.4.1.12345.1.2.4` - Número de respuestas HTTP 3xx
- `1.3.6.1.4.1.12345.1.2.5` - Número de respuestas HTTP 4xx
- `1.3.6.1.4.1.12345.1.2.6` - Número de respuestas HTTP 5xx
- `1.3.6.1.4.1.12345.1.2.7` - Último tiempo de respuesta HTTP (ms)
- `1.3.6.1.4.1.12345.1.2.8` - Tiempo de respuesta promedio HTTP (ms)
- `1.3.6.1.4.1.12345.1.2.9` - Número de limitaciones de tasa

### Sistema

- `1.3.6.1.4.1.12345.1.3.1` - Uso de CPU (%)
- `1.3.6.1.4.1.12345.1.3.2` - Uso de memoria (%)
- `1.3.6.1.4.1.12345.1.3.3` - Memoria total (bytes)
- `1.3.6.1.4.1.12345.1.3.4` - Memoria libre (bytes)
- `1.3.6.1.4.1.12345.1.3.5` - Tiempo de actividad del servidor (segundos)

## Monitoreo con Zabbix

Se proporciona una plantilla de Zabbix para monitorear fácilmente el gateway OPC UA. Para generar la plantilla:

```
npm run generate:zabbix
```

La plantilla se guarda en `tools/zabbix_template.xml` y se puede importar directamente en Zabbix.

### Opciones de Seguridad SNMP en la Plantilla Zabbix

Puedes personalizar la configuración de seguridad SNMP al generar la plantilla:

```
# Generar plantilla con SNMPv2c
node src/tools/generateZabbixTemplate.js --version 2c

# Generar plantilla con SNMPv3 personalizado
node src/tools/generateZabbixTemplate.js --version 3 --user zabbix --level authPriv --auth SHA1 --priv AES256
```

Para más opciones:

```
node src/tools/generateZabbixTemplate.js --help
```
