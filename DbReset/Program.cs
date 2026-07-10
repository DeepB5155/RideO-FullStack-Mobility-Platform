using System;
using System.Threading.Tasks;
using Npgsql;

class Program
{
    static async Task Main(string[] args)
    {
        string connStr = "Host=localhost;Port=5432;Database=rideo_db;Username=rideo_admin;Password=rideo_password";
        using var conn = new NpgsqlConnection(connStr);
        await conn.OpenAsync();

        string[] tables = {
            "\"ChatMessages\"", "\"EmergencySOSLogs\"", "\"Notifications\"", "\"Payments\"",
            "\"PayoutRequests\"", "\"Complaints\"", "\"DriverDocuments\"",
            "\"RecurringBookings\"", "\"Bookings\"", "\"Routes\"", "\"Wallets\"",
            "\"Vehicles\"", "\"Drivers\""
        };

        foreach (var table in tables)
        {
            try {
                using var cmd = new NpgsqlCommand($"TRUNCATE TABLE {table} CASCADE;", conn);
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"Truncated {table}");
            } catch (Exception ex) {
                Console.WriteLine($"Error on {table}: {ex.Message}");
            }
        }

        // Delete users EXCEPT admins
        using var cmdUser = new NpgsqlCommand("DELETE FROM \"Users\" WHERE \"Role\" != 'Admin';", conn);
        int deleted = await cmdUser.ExecuteNonQueryAsync();
        Console.WriteLine($"Deleted {deleted} users.");
    }
}
