[Read this in English](README.md)

# Gateway OPC UA

Gateway para la comunicación con servidores OPC UA, implementado en Node.js.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Características

- Conexión segura a servidores OPC UA
- API REST para lectura de valores
- Sistema de agrupamiento de conexiones
- Manejo automático de reconexiones
- Registro configurable
- Endpoints de monitoreo de salud
- Estructura modular y mantenible
- Soporte para diferentes políticas de seguridad OPC UA
- Autenticación básica
- Autenticación por clave API
- Limitación de solicitudes
- Protección CORS
- Encabezados de seguridad (Helmet)
- Monitoreo SNMP para recolección de métricas

## Estructura del Proyecto

```
project/
├── src/
│   ├── config/
│   │   ├── config.js         # Configuracion centralizada
│   │   └── corsConfig.js     # Configuracion CORS
│   │
│   ├── services/
│   │   └── opcuaService.js   # Servicio OPC UA
│   ├── middleware/
│   │   ├── requestLogger.js  # Middleware de registro
│   │   ├── combinedAuth.js   # Autenticacion combinada
│   │   └── rateLimiter.js    # Limite de tasa
│   ├── routes/
│   │   ├── healthRoutes.js   # Rutas de verificacion de salud
│   │   ├── configRoutes.js   # Rutas de configuracion
│   │   └── iotgatewayRoutes.js # Rutas principales
│   ├── utils/
│   │   └── logger.js         # Configuracion de registro
│   ├── app.js                # Aplicacion Express
│   └── server.js             # Punto de entrada
├── certificates/             # Certificados OPC UA (opcional)
│   ├── client_cert.pem
│   ├── client_key.pem
│   ├── trusted/
│   └── rejected/
├── public/                  # Archivos estaticos
├── .env                     # Variables de entorno
├── Dockerfile
└── docker-compose.yml
```

## Configuración

### Variables de Entorno

```env
# Configuración OPC UA
OPC_ENDPOINT=opc.tcp://127.0.0.1:4840
OPC_SECURITY_MODE=1
OPC_SECURITY_POLICY=None
OPC_NAMESPACE=2
OPC_APPLICATION_URI=urn:CLIENT:NodeOPCUA-Client

# Configuración de Certificados OPC UA (opcional, solo para modos seguros)
OPC_CERTIFICATE_FILE=./certificates/client_cert.pem
OPC_PRIVATE_KEY_FILE=./certificates/client_key.pem
OPC_TRUSTED_FOLDER=./certificates/trusted
OPC_REJECTED_FOLDER=./certificates/rejected

# Configuración de Conexión
CONNECTION_RETRY_MAX=5
CONNECTION_INITIAL_DELAY=1000
CONNECTION_MAX_RETRY=10
CONNECTION_MAX_DELAY=10000
CONNECTION_RETRY_DELAY=5000

# Configuración del Servidor
SERVER_PORT=3000

# Configuración de Registro
LOG_LEVEL=info
LOG_FILE_ERROR=error.log
LOG_FILE_COMBINED=combined.log
LOG_TO_CONSOLE=true

# Configuración de Seguridad
API_KEY=your_api_key_here
AUTH_USERNAME=admin
AUTH_PASSWORD=your_secure_password
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
CORS_MAX_AGE=600
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Configuración SNMP
ENABLE_SNMP=true
SNMP_PORT=161
SNMP_COMMUNITY=public
```

### Características de Seguridad

#### Métodos de Autenticación

El gateway soporta dos métodos de autenticación que pueden ser utilizados de forma independiente:

1. **Autenticación Básica**

   - Autenticación con nombre de usuario y contraseña
   - Credenciales configuradas en variables de entorno
   - Utiliza la Autenticación Básica HTTP estándar
   - Ideal para interacciones humanas y pruebas
   - Ejemplo de uso:
     ```bash
     # Usando curl con Autenticación Básica
     curl -X GET "http://localhost:3000/iotgateway/read?ids=node-id" \
     -u "admin:your_secure_password"
     ```

2. **Autenticación por Clave API**
   - Autenticación simple basada en clave
   - Clave API configurada en variables de entorno
   - Enviada a través del encabezado X-API-Key
   - Ideal para comunicación máquina a máquina
   - Ejemplo de uso:
     ```bash
     # Usando curl con Clave API
     curl -X GET "http://localhost:3000/iotgateway/read?ids=node-id" \
     -H "X-API-Key: your_api_key_here"
     ```

#### Limitación de Solicitudes

- Protege contra abusos y ataques DoS
- Límites configurables por dirección IP
- Predeterminado: 100 solicitudes cada 15 minutos
- Personalizable a través de variables de entorno:
  - `RATE_LIMIT_WINDOW_MS`: Ventana de tiempo en milisegundos
  - `RATE_LIMIT_MAX`: Máximo de solicitudes por ventana

#### Protección CORS

- Orígenes permitidos configurables
- Encabezados seguros con Helmet
- Soporte para credenciales
- Opciones de configuración:
  - `ALLOWED_ORIGINS`: Lista de dominios permitidos separados por comas
  - `CORS_MAX_AGE`: Duración de la caché de preflight

#### Seguridad de la API

- Todos los puntos finales bajo `/iotgateway` requieren autenticación
- El punto final de verificación de salud permanece público
- Los puntos finales de configuración solo están disponibles en desarrollo
- Bloqueo automático de solicitudes no autorizadas
- Registro de seguridad detallado

### Métricas y Monitoreo

El gateway incluye un sistema completo de monitoreo que expone métricas a través de:

1. **API REST**: Accede a las métricas a través de endpoints autenticados en `/api/metrics`

   - `/api/metrics` - Todas las métricas
   - `/api/metrics/opcua` - Métricas específicas de OPC UA
   - `/api/metrics/http` - Métricas de solicitudes HTTP
   - `/api/metrics/system` - Métricas del sistema (CPU, memoria, etc.)

2. **SNMP**: Monitorea el gateway de forma remota utilizando herramientas compatibles con SNMP como Zabbix.

   Cuando está habilitado, el gateway expone métricas vía SNMP en el puerto configurado (predeterminado: 161).
   El gateway utiliza el OID empresarial `1.3.6.1.4.1.12345` y organiza las métricas de la siguiente manera:

   - Métricas OPC UA: `1.3.6.1.4.1.12345.1.1.*`
   - Métricas HTTP: `1.3.6.1.4.1.12345.1.2.*`
   - Métricas del Sistema: `1.3.6.1.4.1.12345.1.3.*`

   Para un mapeo detallado de OIDs, comprueba los logs de la aplicación al iniciar cuando SNMP está habilitado.

#### Métricas Disponibles

**Métricas OPC UA:**

- Número de conexiones activas
- Conteo de errores
- Intentos de reconexión
- Conteo de solicitudes
- Conteo de operaciones de lectura/escritura
- Tiempos de respuesta

**Métricas HTTP:**

- Conteo de solicitudes por código de estado
- Tasas de error
- Tiempos de respuesta
- Bloqueos por límite de peticiones

**Métricas del Sistema:**

- Uso de CPU
- Utilización de memoria
- Tiempo de actividad

#### Configuración con Zabbix

1. Añade el gateway como un host SNMP en Zabbix
2. Configura la cadena de comunidad SNMP para que coincida con la variable de entorno `SNMP_COMMUNITY`
3. Importa la plantilla o crea elementos para cada OID de interés

Habilitar el monitoreo SNMP requiere establecer `ENABLE_SNMP=true` en tu configuración de entorno.

## Endpoints de la API

### Leer valores OPC UA

```http
GET /iotgateway/read?ids=<node-id>
```

Opciones de autenticación:

1. Usando Clave API:

```http
GET /iotgateway/read?ids=<node-id>
X-API-Key: your_api_key_here
```

2. Usando Autenticación Básica:

```http
GET /iotgateway/read?ids=<node-id>
Authorization: Basic base64(username:password)
```

#### Parámetros de la Solicitud

- `ids`: ID del nodo o lista de IDs de nodos separados por comas para leer

#### Formato de Respuesta

```json
{
	"readResults": [
		{
			"id": "node-id", // El ID del nodo solicitado
			"s": true, // Indicador de éxito
			"r": "Good", // Estado de lectura
			"v": "value", // El valor real
			"t": 1647123456789 // Marca de tiempo
		}
	]
}
```

### Escribir valores OPC UA

```http
POST /iotgateway/write
Content-Type: application/json
X-API-Key: your_api_key_here
```

#### Cuerpo de la Solicitud

```json
[
	{
		"id": "node-id",
		"value": "nuevo-valor"
	}
]
```

#### Formato de Respuesta

```json
{
	"writeResults": [
		{
			"id": "node-id",
			"success": true,
			"message": "Valor escrito exitosamente"
		}
	]
}
```

### Lectura Directa de Nodos OPC UA

```http
GET /api/opcua/read/:nodeId
```

#### Formato de Respuesta

```json
{
	"nodeId": "ns=2;s=MiVariable",
	"value": "datos-valor"
}
```

### Escritura Directa de Nodos OPC UA

```http
POST /api/opcua/write/:nodeId
Content-Type: application/json
```

#### Cuerpo de la Solicitud

```json
{
	"value": "nuevo-valor"
}
```

#### Formato de Respuesta

```json
{
	"nodeId": "ns=2;s=MiVariable",
	"message": "Valor escrito exitosamente"
}
```

### Estado de Conexión OPC UA

```http
GET /api/opcua/status
```

#### Formato de Respuesta

```json
{
	"connected": true,
	"endpoint": "opc.tcp://127.0.0.1:4840",
	"lastConnection": "2023-03-15T14:30:45.123Z"
}
```

### Verificación de Estado

```http
GET /health
```

No se requiere autenticación para este endpoint.

#### Respuesta

```json
{
	"status": "UP",
	"opcClient": "CONNECTED",
	"opcEndpoint": "opc.tcp://127.0.0.1:4840",
	"time": 1647123456789
}
```

### Configuración (Solo en Desarrollo)

```http
GET /config
```

Disponible solo en modo desarrollo.

#### Respuestas de Error

1. Autenticación Fallida:

```json
{
	"error": "Se requiere autenticación (Autenticación Básica o Clave API)"
}
```

2. Credenciales Inválidas:

```json
{
	"error": "Credenciales de autenticación inválidas"
}
```

3. Límite de Solicitudes Excedido:

```json
{
	"error": "Demasiadas solicitudes desde esta IP, por favor intente de nuevo más tarde"
}
```

## Manejo de Errores

- Reconexión automática en caso de pérdida de conexión
- Agrupamiento de conexiones para mejor rendimiento
- Registro de errores detallado con marcas de tiempo
- Middleware de manejo de errores centralizado
- Manejo de errores de límite de solicitudes
- Manejo de errores de autenticación
- Respuestas de error elegantes

## Mejores Prácticas de Seguridad

1. **Autenticación**

   - Utilizar contraseñas fuertes para la Autenticación Básica
   - Generar claves API aleatorias y seguras
   - Rotar las claves API periódicamente
   - Usar HTTPS en producción

2. **Configuración**

   - Nunca comprometer archivos .env
   - Usar credenciales diferentes para desarrollo y producción
   - Actualizar regularmente las dependencias de seguridad
   - Monitorear los registros de seguridad

3. **Seguridad de Red**
   - Configurar cuidadosamente los orígenes permitidos
   - Usar limitación de solicitudes adecuada para su caso de uso
   - Habilitar HTTPS en producción
   - Auditorías de seguridad regulares

## Requisitos

- Node.js >= 14.0.0
- Servidor OPC UA accesible
- Certificados válidos (para modos seguros)
- Clave API segura
- Credenciales de Autenticación Básica
- Certificado HTTPS (recomendado para producción)

## Instalación y Despliegue

### Configuración de Desarrollo

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con su configuración

# Iniciar servidor de desarrollo
npm run dev
```

### Despliegue en Producción

```bash
# Instalar dependencias
npm install --production

# Configurar variables de entorno
# Asegúrese de usar credenciales seguras!

# Iniciar servidor de producción
npm start
```

### Despliegue en Docker

```bash
# Construir imagen
docker build -t opcua-gateway .

# Ejecutar contenedor
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  opcua-gateway

# Usando docker-compose
docker-compose up -d
```

## Código de Conducta

Tenga en cuenta que este proyecto tiene un [Código de Conducta](CODE_OF_CONDUCT.md).
Al participar en este proyecto, acepta cumplir con sus términos.

## Contribuir

Este proyecto utiliza [Commits Convencionales](https://www.conventionalcommits.org/) para los mensajes de commit. Esto nos permite generar automáticamente registros de cambios y determinar la próxima versión.

El formato para los mensajes de commit es:

```
<tipo>(<ámbito>): <descripción>

[cuerpo opcional]

[footer(s) opcional(es)]
```

Donde `<tipo>` es uno de:

- **feat**: Una nueva característica
- **fix**: Una corrección de error
- **docs**: Cambios solo en la documentación
- **style**: Cambios que no afectan el significado del código
- **refactor**: Un cambio de código que no corrige un error ni añade una característica
- **perf**: Un cambio de código que mejora el rendimiento
- **test**: Añadir pruebas faltantes o corregir pruebas existentes
- **build**: Cambios en el sistema de construcción o dependencias externas
- **ci**: Cambios en los archivos y scripts de configuración de CI
- **chore**: Otros cambios que no modifican los archivos src o test
- **revert**: Revierte un commit anterior
- **config**: Cambios en los archivos de configuración

Para más detalles, por favor consulte el archivo [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulte el archivo [LICENSE](LICENSE) para obtener detalles.

## Autor

Diego Morales
