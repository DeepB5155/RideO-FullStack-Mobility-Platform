db = db.getSiblingDB('rideo_mongo');

db.createCollection('location_logs');
db.createCollection('ride_history');
db.createCollection('chat_logs');

// Create indexes for fast geospatial queries
db.location_logs.createIndex({ "driverId": 1, "timestamp": -1 });
db.location_logs.createIndex({ "location": "2dsphere" });

db.chat_logs.createIndex({ "rideId": 1, "timestamp": 1 });
