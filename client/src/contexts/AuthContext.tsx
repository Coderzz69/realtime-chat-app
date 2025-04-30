import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db, setUserStatus } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { AuthState, FirebaseUser, UserProfile } from "../types";

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // User is signed in
          const firebaseUser: FirebaseUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          };

          // Get or create user profile
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            // Update user status to online
            await setUserStatus(user.uid, 'online');
            
            const userData = userDoc.data();
            const userProfile: UserProfile = {
              id: user.uid,
              username: userData.username,
              displayName: userData.displayName || user.displayName || 'User',
              photoURL: userData.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName || 'User')}&background=random`,
              status: 'online',
              lastSeen: userData.lastSeen?.toDate(),
              bio: userData.bio
            };
            
            setState({
              user: firebaseUser,
              profile: userProfile,
              loading: false,
              error: null
            });
          } else {
            // Create a new user profile if it doesn't exist
            const userProfile: UserProfile = {
              id: user.uid,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`,
              status: 'online'
            };
            
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              email: user.email,
              displayName: userProfile.displayName,
              photoURL: userProfile.photoURL,
              status: 'online',
              lastSeen: serverTimestamp(),
              createdAt: serverTimestamp()
            });
            
            setState({
              user: firebaseUser,
              profile: userProfile,
              loading: false,
              error: null
            });
          }
        } catch (error) {
          setState({
            user: null,
            profile: null,
            loading: false,
            error: (error as Error).message
          });
        }
      } else {
        // User is signed out
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null
        });
      }
    });
    
    // Set up beforeunload event to update status to offline when closing the browser
    const handleBeforeUnload = () => {
      if (state.user) {
        setUserStatus(state.user.uid, 'offline');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set status to offline when unmounting
      if (state.user) {
        setUserStatus(state.user.uid, 'offline');
      }
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setState({ ...state, loading: true, error: null });
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: (error as Error).message
      });
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setState({ ...state, loading: true, error: null });
      await auth.signInWithPopup(new auth.GoogleAuthProvider());
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: (error as Error).message
      });
      throw error;
    }
  };

  // Register with email and password
  const register = async (email: string, password: string, displayName: string) => {
    try {
      setState({ ...state, loading: true, error: null });
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Update profile with display name
      await userCredential.user.updateProfile({ displayName });
    } catch (error) {
      setState({
        ...state,
        loading: false,
        error: (error as Error).message
      });
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      if (state.user) {
        // Set status to offline before signing out
        await setUserStatus(state.user.uid, 'offline');
      }
      
      await auth.signOut();
    } catch (error) {
      setState({
        ...state,
        error: (error as Error).message
      });
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!state.user) throw new Error("No authenticated user");
      
      const userRef = doc(db, "users", state.user.uid);
      
      await setDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local state
      if (state.profile) {
        setState({
          ...state,
          profile: { ...state.profile, ...data }
        });
      }
    } catch (error) {
      setState({
        ...state,
        error: (error as Error).message
      });
      throw error;
    }
  };

  const value = {
    ...state,
    signIn,
    signInWithGoogle,
    register,
    signOut,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
