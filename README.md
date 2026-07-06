# RideO Setup Guide for a New PC

When you get your new PC, follow these steps sequentially to get the entire RideO platform up and running locally.

## 1. Prerequisites (Install these first)
Ensure you have the following installed on your new machine:
- **Node.js** (v22 or higher)
- **.NET 10 SDK** (for the backend)
- **Docker Desktop** (for PostgreSQL and MongoDB)
- **Git**
- **Android Studio** (for the React Native emulator)

---

## 2. Clone the Repository
Open your terminal and pull your project from GitHub:
```bash
git clone https://github.com/DeepB5155/RideO-FullStack-Mobility-Platform.git
cd RideO-FullStack-Mobility-Platform
```

---

## 3. Database Setup (Docker)
We use Docker to quickly spin up the PostgreSQL and MongoDB instances.
1. Make sure Docker Desktop is open and running.
2. In the root of the project, run:
```bash
docker-compose up -d
```
*(This will download the database images and run them in the background).*

---

## 4. Backend Setup (.NET 10)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. **Create your `.env` file:** 
   Copy the `.env.example` file and rename it to `.env`. It should look like this:
   ```env
   POSTGRES_CONNECTION_STRING="Host=localhost;Port=5433;Database=rideo_db;Username=rideo_admin;Password=rideo_password"
   MONGO_CONNECTION_STRING="mongodb://localhost:27017"
   MONGO_DATABASE_NAME="RideO_Logs"
   JWT_SECRET="YOUR_NEW_SECURE_JWT_SECRET"
   JWT_ISSUER="RideO_Backend"
   JWT_AUDIENCE="RideO_MobileApp"
   ALLOWED_CORS_ORIGINS="http://localhost:5173"
   ```
3. **Install Dependencies & Migrate Database:**
   ```bash
   dotnet restore
   dotnet ef database update
   ```
4. **Run the Backend:**
   ```bash
   dotnet run
   ```
   *(Keep this terminal open! The API will run on `http://localhost:5248`)*

---

## 5. Admin Portal Setup (React/Vite)
Open a **new terminal tab** in the project root.
1. Navigate to the admin folder:
   ```bash
   cd admin
   ```
2. **Create your `.env` file:**
   Copy `.env.example` to `.env`.
   ```env
   VITE_API_BASE_URL="http://localhost:5248/api"
   VITE_SIGNALR_HUB_URL="http://localhost:5248/ridehub"
   ```
3. **Install and Run:**
   ```bash
   npm install
   npm run dev
   ```
   *(The admin dashboard will be available at `http://localhost:5173`)*

---

## 6. Mobile Apps Setup (User & Driver)
Open a **new terminal tab** for the mobile apps.

> [!IMPORTANT]
> Because you are running React Native on an Android emulator, `localhost` points to the emulator itself, not your PC! 
> You MUST find your new PC's local IP address (open terminal and type `ipconfig` -> look for IPv4 Address, usually something like `192.168.1.xxx`).

### Driver App
1. Navigate to the driver app:
   ```bash
   cd driver
   ```
2. **Create your `.env` file:**
   Copy `.env.example` to `.env` and **replace the IP address** with your new PC's actual IPv4 address:
   ```env
   API_BASE_URL="http://YOUR_NEW_IP_ADDRESS:5248/api"
   SIGNALR_HUB_URL="http://YOUR_NEW_IP_ADDRESS:5248/ridehub"
   MAPBOX_ACCESS_TOKEN="YOUR_ACTUAL_MAPBOX_TOKEN"
   ```
3. **Install and Run:**
   ```bash
   npm install
   npm run android
   ```

### User App
1. Navigate to the user app:
   ```bash
   cd user
   ```
2. **Create your `.env` file:** (Same rules apply for the IP address!)
   Copy `.env.example` to `.env`.
3. **Install and Run:**
   ```bash
   npm install
   npm run android
   ```

---

> [!TIP]
> **Checklist for Success:**
> 1. Did you run `docker-compose up -d`?
> 2. Did you create `.env` files in `backend`, `admin`, `user`, and `driver`?
> 3. Did you change `192.168.x.x` in the mobile `.env` files to your new PC's IP address?
> 4. Do you have your Mapbox token inserted?
