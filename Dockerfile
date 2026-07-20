# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app

# Force development environment during build stage to guarantee all devDependencies are installed
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=2048"

COPY package*.json ./
# Install all dependencies (Vite is now in dependencies, so it always installs)
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (only the compiled static files)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
