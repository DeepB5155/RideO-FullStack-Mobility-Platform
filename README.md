# RideO Platform

Welcome to the RideO platform, built with a Microservices-inspired architecture. This project consists of a .NET 8 backend, a React web admin dashboard, and two React Native mobile applications.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for running Postgres & MongoDB)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18+)
- [React Native CLI environment](https://reactnative.dev/docs/environment-setup) (Android Studio / Xcode)

---

## 1. Start the Databases (Docker Required)
From the root of the `RIdeO` project:
```bash
docker-compose up -d
```
*This starts PostgreSQL on `:5432` and MongoDB on `:27017` with schemas initialized.*

## 2. Start the Backend API (.NET 8)
Open a new terminal and navigate to the backend folder:
```bash
cd backend
dotnet restore
dotnet run
```
*The API will start at `http://localhost:5000` (or `https://localhost:5001`). View the swagger UI at `http://localhost:5000/swagger`.*

## 3. Start the Admin Dashboard (React + Vite)
Open a new terminal and navigate to the admin folder:
```bash
cd admin
npm install
npm run dev
```
*The dashboard will be available at `http://localhost:5173`.*

## 4. Start the Mobile Apps (React Native)
**For the User App:**
```bash
cd user
npm install
npm start # Starts Metro bundler

# Open a new terminal to run the platform specific build
npm run android # OR npm run ios
```

**For the Driver App:**
```bash
cd driver
npm install
npm start # Starts Metro bundler

# Open a new terminal to run the platform specific build
npm run android # OR npm run ios
```

---
*Note: The React Native and Backend applications can run concurrently in multiple terminals. The Backend must be running for any of the apps to register Users, Rides, or utilize the Antigravity Engine.*
