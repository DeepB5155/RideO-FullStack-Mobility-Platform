using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace RideO.API.Models
{
    public class LocationLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("driverId")]
        public string DriverId { get; set; } = string.Empty;

        [BsonElement("location")]
        public GeoJsonPoint Location { get; set; } = new GeoJsonPoint();

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class GeoJsonPoint
    {
        [BsonElement("type")]
        public string Type { get; set; } = "Point";
        
        [BsonElement("coordinates")]
        public double[] Coordinates { get; set; } = new double[2]; // [longitude, latitude]
    }
}
