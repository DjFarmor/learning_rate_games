# Stage 1: Build
# Use --platform to ensure we build for the correct target even on M4
FROM node:22 AS builder
WORKDIR /app/app

# Copy package files
COPY app/package.json app/package-lock.json* ./

# Install all dependencies
RUN npm install

# Copy the rest of the source code
COPY app/ .

# Build the frontend assets
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-slim
WORKDIR /app/app

# Set production environment
ENV NODE_ENV=production

# Copy built assets from builder
COPY --from=builder /app/app/dist ./dist
COPY --from=builder /app/app/package.json /app/app/package-lock.json* ./
COPY --from=builder /app/app/server.ts ./

# Install only production dependencies
RUN npm install --omit=dev

# Create necessary directories for data persistence
RUN mkdir -p images questionnaires results

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "--experimental-strip-types", "/app/app/server.ts"]