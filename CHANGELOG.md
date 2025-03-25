# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2025-03-25)


### Features

* **snmp:** implementación de monitoreo SNMP con pruebas unitarias e integración ([0edef96](https://github.com/tinroad/opcua-gateway/commit/0edef967062090e818cbe54e87d520d17e02e027))


### Bug Fixes

* **app:** actualizar rutas y mejorar manejo de errores en SNMP y OPC UA ([e43bc45](https://github.com/tinroad/opcua-gateway/commit/e43bc4573baf3255b6023a68898670df4517e81b))
* **opcua:** mejora en el manejo de errores y métricas en OPCUAService ([6916405](https://github.com/tinroad/opcua-gateway/commit/69164051456026352412267e3e475c11c40d97f9))
* **snmp:** mejora manejo de sesiones y recursos en tests ([9a4d121](https://github.com/tinroad/opcua-gateway/commit/9a4d12100803f3ff31aea72813af1300595d8ee6))

## [1.0.0] - 2023-03-21

### Features

- Initial release
- Secure connection to OPC UA servers
- REST API for value reading and writing
- Connection pooling system
- Automatic reconnection handling
- Configurable logging
- Health monitoring endpoints
- Authentication with Basic Auth and API Key
- Rate limiting and CORS protection
