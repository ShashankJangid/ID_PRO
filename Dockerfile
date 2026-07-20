# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Increase Node.js heap to prevent OOM on limited build machines
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install dependencies (including devDependencies for tsc + vite)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and build
COPY . .
# Build the production application using local dependencies
RUN npm run build

# Stage 2: Serve with Nginx (only the compiled static files)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
