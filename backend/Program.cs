using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RideO.API.Data;
using RideO.API.Hubs;
using RideO.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure EF Core PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSql") ?? "Host=localhost;Port=5433;Database=rideo_db;Username=rideo_admin;Password=rideo_password"));

// Configure MongoDB
builder.Services.AddSingleton<MongoDbContext>();

// Configure Antigravity Engine
builder.Services.AddScoped<AntigravityEngine>();

// Configure SignalR
builder.Services.AddSignalR();

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Allow any origin for mobile/dev
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Automatically apply EF Core creations/migrations for the Relational database.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthorization();

app.MapControllers();
app.MapHub<RideHub>("/rideHub");

app.Run();
