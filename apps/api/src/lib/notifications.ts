const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default';
  badge?: number;
}

export async function sendPushNotification(message: PushMessage) {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ...message, sound: 'default' }),
    });
    const data = await res.json();
    if (data.data?.status === 'error') {
      console.error('Push error:', data.data.message);
    }
    return data;
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
