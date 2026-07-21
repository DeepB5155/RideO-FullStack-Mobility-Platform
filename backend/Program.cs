using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RideO.API.Data;
using RideO.API.Hubs;
using RideO.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Load .env file
Env.Load();

// Add services to the container.
builder.Services.AddHostedService<DailyBookingService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
if (string.IsNullOrEmpty(jwtSecret))
{
    throw new Exception("JWT_SECRET environment variable is missing.");
}
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "RideO_Backend";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "RideO_MobileApp";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };

    // Support SignalR Token Auth
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/rideHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Configure EF Core PostgreSQL
var pgConnectionString = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING") ?? builder.Configuration.GetConnectionString("PostgreSql");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(pgConnectionString));

// Configure MongoDB
builder.Services.AddSingleton<MongoDbContext>();

// Configure Antigravity Engine
builder.Services.AddScoped<AntigravityEngine>();

// Configure FCM Service
builder.Services.AddSingleton<FcmService>();

// Configure SignalR
builder.Services.AddSignalR();

// Register Background Services
builder.Services.AddHostedService<RecurringRouteService>();
builder.Services.AddHostedService<RideReminderService>();

// Enable CORS
var allowedOriginsStr = Environment.GetEnvironmentVariable("ALLOWED_CORS_ORIGINS") ?? "*";
var allowedOrigins = allowedOriginsStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Contains("*"))
        {
            if (builder.Environment.IsDevelopment())
            {
                policy.SetIsOriginAllowed(origin => true)
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            }
            else
            {
                // In production, wildcard with credentials is not allowed. 
                // We must use explicit origins from ALLOWED_CORS_ORIGINS.
                throw new Exception("ALLOWED_CORS_ORIGINS must be explicitly set in production without wildcards.");
            }
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

// Configure Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "Too many requests. Please try again later.",
                retryAfter = retryAfter.TotalSeconds
            }, token);
        }
        else
        {
            await context.HttpContext.Response.WriteAsJsonAsync(new
            {
                message = "Too many requests. Please try again later."
            }, token);
        }
    };

    // AuthLimit: 5 requests per minute per IP
    options.AddPolicy("AuthLimit", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });

    // OtpLimit: 3 requests per 15 minutes per IP
    options.AddPolicy("OtpLimit", httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown_ip";
        return RateLimitPartition.GetFixedWindowLimiter(ip,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(15),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });

    // BookingLimit: 10 requests per minute per user ID (or IP)
    options.AddPolicy("BookingLimit", httpContext =>
    {
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? 
                     httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });

    // RatingLimit: 5 requests per minute per user ID
    options.AddPolicy("RatingLimit", httpContext =>
    {
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? 
                     httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });

    // UploadLimit: 5 requests per minute per user ID
    options.AddPolicy("UploadLimit", httpContext =>
    {
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? 
                     httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });

    // WalletLimit: 5 requests per minute per user ID
    options.AddPolicy("WalletLimit", httpContext =>
    {
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? 
                     httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(userId,
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            });
    });
});

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var app = builder.Build();

// Automatically apply EF Core creations/migrations for the Relational database.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Apply pending migrations instead of EnsureCreated to keep EF History in sync
    dbContext.Database.Migrate();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

// Enable serving static files from wwwroot
app.UseStaticFiles();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.UseRateLimiter();

app.MapControllers();
app.MapHub<RideHub>("/rideHub");

app.Run();

public partial class Program { }
