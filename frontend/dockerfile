# Stage 1: Build the React application
FROM node:18 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with a Node.js server
FROM node:18
WORKDIR /app
COPY --from=build-stage /app/build ./build
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "tcp://0.0.0.0:3000"]
EXPOSE 3000