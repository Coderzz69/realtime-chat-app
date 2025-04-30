import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  orderBy, 
  limit,
  addDoc,
  arrayUnion,
  arrayRemove,
  getDocs
} from "firebase/firestore";

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update the user profile with displayName
  if (userCredential.user) {
    await updateProfile(userCredential.user, {
      displayName
    });
    
    // Create a user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName,
      photoURL: userCredential.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
      status: "online",
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }
  
  return userCredential;
};

export const signOut = () => {
  return firebaseSignOut(auth);
};

// User status functions
export const setUserStatus = async (userId: string, status: 'online' | 'offline') => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    status,
    lastSeen: serverTimestamp()
  });
};

// Conversation functions
export const createConversation = async (participants: string[], name: string | null = null, isGroup: boolean = false) => {
  const conversationRef = collection(db, "conversations");
  
  const newConversation = {
    participants,
    isGroup,
    createdAt: serverTimestamp(),
    lastMessage: null
  };
  
  if (name && isGroup) {
    newConversation['name'] = name;
  }
  
  const docRef = await addDoc(conversationRef, newConversation);
  return docRef.id;
};

export const sendMessage = async (conversationId: string, senderId: string, content: string) => {
  // Add message to the messages collection
  const messagesRef = collection(db, "messages");
  const messageData = {
    conversationId,
    senderId,
    content,
    timestamp: serverTimestamp(),
    read: false
  };
  
  const messageRef = await addDoc(messagesRef, messageData);
  
  // Update the conversation's last message
  const conversationRef = doc(db, "conversations", conversationId);
  await updateDoc(conversationRef, {
    lastMessage: {
      content,
      timestamp: serverTimestamp(),
      senderId
    }
  });
  
  return messageRef.id;
};

export const markMessageAsRead = async (messageId: string) => {
  const messageRef = doc(db, "messages", messageId);
  await updateDoc(messageRef, {
    read: true
  });
};

export const getUserConversations = (userId: string, callback: (conversations: any[]) => void) => {
  const conversationsRef = collection(db, "conversations");
  const q = query(conversationsRef, where("participants", "array-contains", userId));
  
  return onSnapshot(q, async (snapshot) => {
    const conversations = [];
    
    for (const doc of snapshot.docs) {
      const conversationData = doc.data();
      const participantProfiles = [];
      
      // Get participant profiles
      for (const participantId of conversationData.participants) {
        if (participantId !== userId) {
          const userDoc = await getDoc(doc(db, "users", participantId));
          if (userDoc.exists()) {
            participantProfiles.push({
              id: participantId,
              ...userDoc.data()
            });
          }
        }
      }
      
      conversations.push({
        id: doc.id,
        ...conversationData,
        participantProfiles
      });
    }
    
    callback(conversations);
  });
};

export const getConversationMessages = (conversationId: string, callback: (messages: any[]) => void) => {
  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef, 
    where("conversationId", "==", conversationId),
    orderBy("timestamp", "asc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    callback(messages);
  });
};

export const setTypingStatus = async (conversationId: string, userId: string, isTyping: boolean) => {
  const conversationRef = doc(db, "conversations", conversationId);
  
  if (isTyping) {
    await updateDoc(conversationRef, {
      typingUsers: arrayUnion(userId)
    });
  } else {
    await updateDoc(conversationRef, {
      typingUsers: arrayRemove(userId)
    });
  }
};

export const getTypingUsers = (conversationId: string, callback: (typingUsers: string[]) => void) => {
  const conversationRef = doc(db, "conversations", conversationId);
  
  return onSnapshot(conversationRef, (snapshot) => {
    const data = snapshot.data();
    const typingUsers = data?.typingUsers || [];
    callback(typingUsers);
  });
};

export const getUserProfile = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    return {
      id: userId,
      ...userDoc.data()
    };
  }
  
  return null;
};

export const updateUserProfile = async (userId: string, data: any) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const searchUsers = async (query: string) => {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  
  const users = snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(user => {
      const displayName = user.displayName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const searchQuery = query.toLowerCase();
      
      return displayName.includes(searchQuery) || email.includes(searchQuery);
    });
  
  return users;
};
