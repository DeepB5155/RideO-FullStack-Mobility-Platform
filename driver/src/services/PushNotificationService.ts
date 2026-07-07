import messaging from '@react-native-firebase/messaging';
import { Platform, DeviceEventEmitter } from 'react-native';
import axiosInstance from '../api/axios';

export class PushNotificationService {
  static async requestUserPermission() {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('Push notifications not authorized by user');
        return false;
      }
    }
    return true;
  }

  static async getFCMToken(): Promise<string | null> {
    try {
      if (await this.requestUserPermission()) {
        const token = await messaging().getToken();
        console.log('FCM Token:', token);
        return token;
      }
    } catch (error) {
      console.log('Error getting FCM token', error);
    }
    return null;
  }

  static async registerTokenWithBackend() {
    try {
      const token = await this.getFCMToken();
      if (token) {
        await axiosInstance.post('/auth/update-fcm-token', { token });
        console.log('Successfully registered FCM token with backend');
      }
    } catch (error) {
      console.log('Error registering token with backend', error);
    }
  }

  static setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', JSON.stringify(remoteMessage));
      if (remoteMessage.data) {
        DeviceEventEmitter.emit('onPushNotification', remoteMessage.data);
      }
    });

    return unsubscribe;
  }
}
