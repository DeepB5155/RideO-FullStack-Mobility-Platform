CREATE TABLE IF NOT EXISTS "Users" (
    "Id" UUID PRIMARY KEY,
    "FullName" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(255) UNIQUE NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "PhoneNumber" VARCHAR(20),
    "Role" VARCHAR(20) NOT NULL, -- User, Driver, Admin
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Drivers" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID REFERENCES "Users"("Id"),
    "LicenseNumber" VARCHAR(50) UNIQUE NOT NULL,
    "VehicleType" VARCHAR(50),
    "IsAvailable" BOOLEAN DEFAULT FALSE,
    "Rating" DECIMAL(3,2)
);

CREATE TABLE IF NOT EXISTS "Rides" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID REFERENCES "Users"("Id"),
    "DriverId" UUID REFERENCES "Drivers"("Id"),
    "PickupLocation" VARCHAR(255) NOT NULL,
    "DropoffLocation" VARCHAR(255) NOT NULL,
    "Status" VARCHAR(20) NOT NULL, -- Requested, Accepted, Ongoing, Completed, Cancelled
    "Fare" DECIMAL(10,2),
    "RequestedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "CompletedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Payments" (
    "Id" UUID PRIMARY KEY,
    "RideId" UUID REFERENCES "Rides"("Id"),
    "Amount" DECIMAL(10,2) NOT NULL,
    "Status" VARCHAR(20) NOT NULL, -- Pending, Completed, Failed
    "Method" VARCHAR(50),
    "ProcessedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
