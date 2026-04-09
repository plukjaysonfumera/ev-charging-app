import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAu-fHtCb3qdXPf34wf0DqI6bDP3edZ5og',
  authDomain: 'phev-charging-app-4226f.firebaseapp.com',
  projectId: 'phev-charging-app-4226f',
  storageBucket: 'phev-charging-app-4226f.firebasestorage.app',
  messagingSenderId: '182839444700',
  appId: '1:182839444700:web:588de77f5c46a59d88e019',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
