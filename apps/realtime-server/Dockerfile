FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/realtime-server/package.json apps/realtime-server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-engine/package.json packages/game-engine/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY . .
RUN npm run build -w @gift-chaos/shared && npm run build -w @gift-chaos/game-engine && npm run build -w @gift-chaos/database && npm run build -w @gift-chaos/realtime-server
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8080
CMD ["npm", "run", "start", "-w", "@gift-chaos/realtime-server"]
