import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { User } from "@shared/schema";

// Log environment variables to debug
console.log("Firebase config:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Authentication functions
export const registerWithEmail = async (email: string, password: string, username: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with username
    await updateProfile(user, {
      displayName: username
    });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      username,
      email,
      photoURL: user.photoURL || null,
      status: "online",
      lastSeen: serverTimestamp()
    });
    
    return user;
  } catch (error) {
    console.error("Error during registration:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user status to online
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      status: "online",
      lastSeen: serverTimestamp()
    });
    
    return userCredential.user;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};

export const loginWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // Add scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    // Set custom parameters
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    // Use signInWithPopup instead of signInWithRedirect for easier debugging
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log("Google login successful:", user);
    
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      // Create new user in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: user.displayName || `user_${Math.floor(Math.random() * 10000)}`,
        email: user.email,
        photoURL: user.photoURL,
        status: "online",
        lastSeen: serverTimestamp()
      });
    } else {
      // Update user status to online
      await updateDoc(doc(db, "users", user.uid), {
        status: "online",
        lastSeen: serverTimestamp()
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error during Google login:", error);
    console.error("Error details:", JSON.stringify(error));
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      // Update user status to offline
      await updateDoc(doc(db, "users", user.uid), {
        status: "offline",
        lastSeen: serverTimestamp()
      });
    }
    await signOut(auth);
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
};

// Firestore data functions
export const createConversation = async (participants: string[], isGroup: boolean = false, name?: string) => {
  try {
    const newConversationRef = await addDoc(collection(db, "conversations"), {
      participants,
      isGroup,
      name: name || null,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    });
    
    return newConversationRef.id;
  } catch (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

export const sendMessage = async (conversationId: string, senderId: string, content: string, contentType: string = "text") => {
  try {
    const messageRef = await addDoc(collection(db, "messages"), {
      conversationId,
      senderId,
      content,
      contentType,
      createdAt: serverTimestamp(),
      readBy: [senderId]
    });
    
    // Update conversation's lastMessageAt
    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessageAt: serverTimestamp()
    });
    
    return messageRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  try {
    await updateDoc(doc(db, "messages", messageId), {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

export const getConversations = (userId: string, callback: Function) => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const conversations = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(conversations);
  });
};

export const getMessages = (conversationId: string, callback: Function) => {
  const q = query(
    collection(db, "messages"),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

export const getUserData = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

export const searchUsers = async (searchTerm: string) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, 
      where("username", ">=", searchTerm), 
      where("username", "<=", searchTerm + "\uf8ff")
    );
    
    const querySnapshot = await getDocs(q);
    const users: any[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

export const getOnlineStatus = (userId: string, callback: Function) => {
  return onSnapshot(doc(db, "users", userId), (doc) => {
    if (doc.exists()) {
      const userData = doc.data();
      callback(userData.status);
    }
  });
};
