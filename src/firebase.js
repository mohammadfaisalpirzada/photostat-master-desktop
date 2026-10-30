// Firebase Web config — SAME project as the Android app (master-the-quiz-score),
// so desktop and Android share the same login + Firestore data.
// NOTE: for best results register a *Web app* in Firebase console and paste its
// config here (appId/measurementId). Email/Password + Firestore work with this.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC1_dLAL0dAWhs4ffpRddO_OnPbkqWAgBM',
  authDomain: 'master-the-quiz-score.firebaseapp.com',
  projectId: 'master-the-quiz-score',
  storageBucket: 'master-the-quiz-score.firebasestorage.app',
  messagingSenderId: '900136320125',
  appId: '1:900136320125:web:photostatdesktop'
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
