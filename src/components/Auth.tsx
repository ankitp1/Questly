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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full">
          <h1 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight uppercase">QUESTLY 🚀</h1>
          <p className="text-gray-600 mb-8 font-medium">Gamify chores, meals, and habits for your kids!</p>
          <button
            onClick={login}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl transition-all transform hover:scale-105 active:scale-95"
          >
            <LogIn size={24} />
            Sign in with Google
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
