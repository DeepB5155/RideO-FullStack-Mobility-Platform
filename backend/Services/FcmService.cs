using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using System;
using System.IO;
using System.Threading.Tasks;

namespace RideO.API.Services
{
    public class FcmService
    {
        public FcmService()
        {
            try
            {
                if (FirebaseApp.DefaultInstance == null)
                {
                    var pathToKey = Path.Combine(Directory.GetCurrentDirectory(), "firebase-admin-sdk.json");
                    if (File.Exists(pathToKey))
                    {
                        FirebaseApp.Create(new AppOptions()
                        {
                            Credential = GoogleCredential.FromFile(pathToKey)
                        });
                        Console.WriteLine("Firebase Admin SDK initialized successfully.");
                    }
                    else
                    {
                        Console.WriteLine($"WARNING: Firebase Admin Key not found at {pathToKey}. Push notifications will not be sent.");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Firebase initialization failed: {ex.Message}");
            }
        }

        public async Task<bool> SendNotificationAsync(string deviceToken, string title, string body)
        {
            if (string.IsNullOrEmpty(deviceToken) || FirebaseApp.DefaultInstance == null)
            {
                Console.WriteLine($"Simulated Push to {deviceToken}: {title} - {body}");
                return false;
            }

            var message = new Message()
            {
                Token = deviceToken,
                Notification = new Notification()
                {
                    Title = title,
                    Body = body
                }
            };

            try
            {
                string response = await FirebaseMessaging.DefaultInstance.SendAsync(message);
                Console.WriteLine($"Successfully sent message: {response}");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending FCM message: {ex.Message}");
                return false;
            }
        }
    }
}
