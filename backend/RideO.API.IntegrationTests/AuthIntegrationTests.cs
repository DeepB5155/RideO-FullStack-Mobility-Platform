using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace RideO.API.IntegrationTests
{
    public class AuthIntegrationTests : IClassFixture<CustomWebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthIntegrationTests(CustomWebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Register_WithValidData_ReturnsSuccess()
        {
            // Arrange
            var registerRequest = new
            {
                FullName = "Integration Test User",
                Email = "integration@test.com",
                PhoneNumber = "+1234567890",
                Password = "Password123"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

            // Assert
            response.IsSuccessStatusCode.Should().BeTrue();
            
            var result = await response.Content.ReadFromJsonAsync<dynamic>();
            Assert.NotNull(result);
            
            // Note: Since this is dynamic, we just check success code for now.
        }
    }
}
