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
            var connectionString = configuration.GetConnectionString("MongoDb");
            var client = new MongoClient(connectionString ?? "mongodb://rideo_admin:rideo_password@localhost:27017/rideo_mongo?authSource=admin");
            _database = client.GetDatabase("rideo_mongo");
        }

        public IMongoCollection<LocationLog> LocationLogs => _database.GetCollection<LocationLog>("location_logs");
    }
}
