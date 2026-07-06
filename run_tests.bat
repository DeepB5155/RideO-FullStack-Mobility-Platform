@echo off
dotnet sln RIdeO.sln add backend/RideO.API.Tests/RideO.API.Tests.csproj
dotnet sln RIdeO.sln add backend/RideO.API.IntegrationTests/RideO.API.IntegrationTests.csproj
dotnet test RIdeO.sln
