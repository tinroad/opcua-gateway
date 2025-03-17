FROM node:18-alpine

# Crear directorio de aplicación
WORKDIR /usr/src/app

# Instalar dependencias
COPY package*.json ./
RUN npm install --only=production

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p /usr/src/app/logs

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "app.js"]