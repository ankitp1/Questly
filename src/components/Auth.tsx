import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';

interface AuthProps {
  showSignOut?: boolean;
}

export function Auth({ showSignOut = true }: AuthProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = () => signOut(auth);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-12 rounded-[2rem] shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="mb-8">
            <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter uppercase">EARNIT</h1>
            <div className="h-1 w-12 bg-indigo-600 mx-auto rounded-full" />
          </div>
          <p className="text-slate-500 mb-10 font-medium text-lg leading-relaxed">
            A professional habit-building platform for modern families.
          </p>
          <button
            onClick={login}
            className="flex items-center justify-center gap-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 px-6 rounded-2xl transition-all shadow-lg shadow-slate-200"
          >
            <LogIn size={20} />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (!showSignOut) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={logout}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium transition-all"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
