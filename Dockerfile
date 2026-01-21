# Dockerfile - Node 18 LTS
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Copy source
COPY . .

# Build admin UI if present
RUN if [ -d "./admin" ]; then cd admin && npm ci && npm run build && cd ..; fi

# Generate Prisma client (optional)
RUN npx prisma generate || true

ENV NODE_ENV=production

EXPOSE 3000
CMD ["node", "server.js"]