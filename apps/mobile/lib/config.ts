import Constants from 'expo-constants';

// In development, use your local IP. In production EAS builds, use the Railway URL.
const ENV = {
  dev: {
    API_URL: 'http://192.168.1.151:3000',
  },
  prod: {
    API_URL: 'https://your-api.up.railway.app', // ← replace after Railway deploy
  },
};

const isDev = __DEV__;

export const API_URL = isDev ? ENV.dev.API_URL : ENV.prod.API_URL;
