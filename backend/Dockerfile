FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3001

# Produção: usa código compilado; Dev: usar docker-compose command override
CMD ["node", "dist/server.js"]
