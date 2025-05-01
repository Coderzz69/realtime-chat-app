import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, loginWithEmail, loginWithGoogle, registerWithEmail, logoutUser, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface AuthContextProps {
  currentUser: FirebaseUser | null;
  userProfile: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<FirebaseUser>;
  register: (email: string, password: string, username: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  currentUser: null,
  userProfile: null,
  isLoading: true,
  login: async () => {
    throw new Error("Function not implemented");
  },
  loginWithGoogle: async () => {
    throw new Error("Function not implemented");
  },
  register: async () => {
    throw new Error("Function not implemented");
  },
  logout: async () => {
    throw new Error("Function not implemented");
  },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUserProfile(null);
      return;
    }

    const unsubscribeUserProfile = onSnapshot(
      doc(db, "users", currentUser.uid),
      (doc) => {
        if (doc.exists()) {
          setUserProfile(doc.data());
        } else {
          setUserProfile(null);
        }
      }
    );

    return () => unsubscribeUserProfile();
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    isLoading,
    login: loginWithEmail,
    loginWithGoogle,
    register: registerWithEmail,
    logout: logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
