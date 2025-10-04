
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AppUser extends User {
    institutionName?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signup: (institutionName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicRoutes = ['/login', '/signup', '/forgot-password', '/'];
const publicAppRoutes = ['/about'];


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            setUser({ ...user, institutionName: userDoc.data().institutionName });
        } else {
            setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
        const isPublicAuthRoute = publicRoutes.includes(pathname);
        const isPublicAppRoute = publicAppRoutes.includes(pathname);
        
        if (user && isPublicAuthRoute && pathname !== '/') {
            router.push('/dashboard');
        } else if (!user && !isPublicAuthRoute && !isPublicAppRoute) {
            router.push('/login');
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname]);

  const signup = async (institutionName: string, email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save institution name to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        institutionName: institutionName,
      });
      setUser({ ...user, institutionName });

      toast({ title: "Account Created", description: "You have been successfully signed up.", className: "bg-accent text-accent-foreground" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Sign Up Failed", description: error.message, variant: "destructive" });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Welcome back!", className: "bg-accent text-accent-foreground" });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({ title: "Logout Failed", description: error.message, variant: "destructive" });
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions.", className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Password Reset Failed", description: error.message, variant: "destructive" });
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      let institutionName = user.displayName || "Google User";

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
            email: user.email,
            institutionName: institutionName,
        });
      } else {
        institutionName = userDoc.data().institutionName;
      }
      
      setUser({ ...user, institutionName });
      toast({ title: "Signed In with Google", description: "Welcome!", className: "bg-accent text-accent-foreground" });
      router.push('/dashboard');

    } catch (error: any) {
        console.error(error);
        toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const isAuthPage = publicRoutes.includes(pathname);
  if(!user && !isAuthPage && !publicAppRoutes.includes(pathname)){
      // This block will be effectively handled by the useEffect now, 
      // but we still need to return a loading state to prevent rendering children.
      return (
         <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
         </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, sendPasswordReset, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
