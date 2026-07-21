using MongoDB.Driver;
using RideO.API.Models;
using Microsoft.Extensions.Configuration;

namespace RideO.API.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = Environment.GetEnvironmentVariable("MONGO_CONNECTION_STRING") ?? configuration.GetConnectionString("MongoDb");
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new Exception("MongoDb connection string is missing.");
            }
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase("rideo_mongo");
        }

        public IMongoCollection<LocationLog> LocationLogs => _database.GetCollection<LocationLog>("location_logs");
    }
}
