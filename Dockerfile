FROM node:22-alpine

ENV NODE_ENV=production

# Crear directorio de aplicación
WORKDIR /usr/src/app

# Instalar dependencias
COPY package*.json ./
COPY .husky/install.mjs ./.husky/install.mjs
RUN npm install --omit=dev

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p /usr/src/app/logs

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
