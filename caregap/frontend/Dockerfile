# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --no-package-lock

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE ${PORT:-3000}
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
