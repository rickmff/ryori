"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { Auth, User } from "firebase/auth";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => { },
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = (auth as Auth).onAuthStateChanged((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Auth not initialized");

    // 1. Sign in with Firebase client-side
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Get the ID token
    const idToken = await user.getIdToken();

    // 3. Call your API to set the session cookie
    const response = await fetch('/api/auth/sessionLogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Server-side session login failed:", errorData);
      // Throw an error that the LoginForm can catch and display
      throw new Error(errorData.error || 'Failed to establish server session.');
    }

    // 4. Redirect AFTER successful Firebase login AND server session creation
    console.log("Client-side login and server session successful. Redirecting...");
    router.push("/admin/dashboard"); // Redirect to the dashboard
  };

  const handleSignOut = async () => {
    if (!auth) throw new Error("Auth not initialized");
    await signOut(auth);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);