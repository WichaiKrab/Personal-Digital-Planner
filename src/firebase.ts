import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import Swal from 'sweetalert2';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error("Error logging in with Google", error);
    if (error.code === 'auth/unauthorized-domain') {
      Swal.fire({
        title: 'Unauthorized Domain',
        text: 'This domain is not authorized for Firebase Authentication. Please add this domain to your Firebase Console under Authentication > Settings > Authorized domains.',
        icon: 'error',
        confirmButtonColor: '#f43f5e'
      });
    } else {
      Swal.fire({
        title: 'Login Error',
        text: error.message || 'An unexpected error occurred during login.',
        icon: 'error',
        confirmButtonColor: '#f43f5e'
      });
    }
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out", error);
  }
};

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connected");
  } catch (error: any) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
