import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Flame, 
  Target, 
  History, 
  Settings, 
  RefreshCcw, 
  Sparkles,
  Gamepad2
} from 'lucide-react';
import { Auth } from './components/Auth';
import { TokenJar } from './components/TokenJar';
import { RuleLibrary } from './components/RuleLibrary';
import { VisionInspector } from './components/VisionInspector';
import { cn } from './lib/utils';

interface UserStats {
  current_points: number;
  target_goal: number;
  streak_days: number;
  last_completion_date: any;
  active_reward: string;
  visual_theme: string;
}

interface UserProfile {
  adminName: string;
  kidName: string;
}

interface Rule {
  id: string;
  task_name: string;
  action: string;
  point_value: number;
  validation_method: 'Image' | 'Timer' | 'Manual';
  emoji: string;
}

interface HistoryItem {
  id: string;
  task: string;
  points_awarded: number;
  multiplier: number;
  timestamp: any;
  status: string;
}

const INITIAL_RULES: Omit<Rule, 'id'>[] = [
  { task_name: "The Warm-Up", action: "Put pajamas in the hamper.", point_value: 2, emoji: "🧺", validation_method: "Manual" },
  { task_name: "Clean Sweep", action: "Clear all toys off the bedroom floor.", point_value: 5, emoji: "🧹", validation_method: "Image" },
  { task_name: "Power Play", action: "Finish a \"Wonderbook\" from the library.", point_value: 10, emoji: "📚", validation_method: "Manual" },
  { task_name: "The Safe Hands", action: "Put shoes in the cubby/closet.", point_value: 3, emoji: "👟", validation_method: "Image" },
  { task_name: "Innings Break", action: "Finish a healthy meal within the timer.", point_value: 10, emoji: "🍽️", validation_method: "Timer" },
  { task_name: "Team Player", action: "Help with the groceries.", point_value: 5, emoji: "🛒", validation_method: "Manual" },
  { task_name: "Night Watchman", action: "Brush teeth without being asked twice.", point_value: 4, emoji: "🪥", validation_method: "Manual" },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<UserProfile>({ adminName: 'Admin', kidName: 'Junior' });
  const [rules, setRules] = useState<Rule[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeInspector, setActiveInspector] = useState<'Room' | 'Plate' | null>(null);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'kid' | 'admin'>('kid');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Every user is an admin of their own instance
        setViewMode('admin');
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const statsRef = doc(db, 'users', user.uid, 'stats', 'current');
    const profileRef = doc(db, 'users', user.uid, 'profile', 'settings');
    const rulesRef = collection(db, 'users', user.uid, 'rules');
    const historyRef = query(collection(db, 'users', user.uid, 'history'), orderBy('timestamp', 'desc'));

    const unsubStats = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setStats(doc.data() as UserStats);
      } else {
        setDoc(statsRef, {
          current_points: 0,
          target_goal: 50,
          streak_days: 0,
          last_completion_date: null,
          active_reward: "$5 Treat Trip",
          visual_theme: "Stadium filling up"
        });
      }
    });

    const unsubProfile = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data() as UserProfile);
      } else {
        // Default profile based on user display name if available
        setDoc(profileRef, {
          adminName: user.displayName?.split(' ')[0] || 'Parent',
          kidName: 'Junior'
        });
      }
    });

    const unsubRules = onSnapshot(rulesRef, (snapshot) => {
      const fetchedRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rule));
      setRules(fetchedRules);
      
      // Seed initial rules if none exist
      if (fetchedRules.length === 0) {
        INITIAL_RULES.forEach(rule => {
          addDoc(rulesRef, { ...rule, created_at: serverTimestamp() });
        });
      }
    });

    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem)));
    });

    return () => {
      unsubStats();
      unsubProfile();
      unsubRules();
      unsubHistory();
    };
  }, [user]);

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'profile', 'settings'), updates, { merge: true });
  };

  const handleAddRule = async (rule: Omit<Rule, 'id'>) => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'rules'), {
      ...rule,
      created_at: serverTimestamp()
    });
  };

  const handleUpdateRule = async (id: string, updates: Partial<Rule>) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'rules', id), updates, { merge: true });
  };

  const handleDeleteRule = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'rules', id));
  };

  const handleCompleteTask = async (rule: Rule) => {
    if (!user || !stats) return;

    if (rule.validation_method === 'Image') {
      setCurrentRule(rule);
      if (rule.action.toLowerCase().includes('room')) setActiveInspector('Room');
      else setActiveInspector('Plate');
      return;
    }

    // Manual or Timer completion
    await processCompletion(rule);
  };

  const handlePointCorrection = async (points: number, type: 'ADD' | 'REMOVE') => {
    if (!user || !stats) return;
    const adjustment = type === 'ADD' ? points : -points;
    
    await setDoc(doc(db, 'users', user.uid, 'stats', 'current'), {
      ...stats,
      current_points: Math.max(0, stats.current_points + adjustment)
    });

    await addDoc(collection(db, 'users', user.uid, 'history'), {
      task: `Manual Adjustment (${type})`,
      points_awarded: adjustment,
      multiplier: 1.0,
      timestamp: serverTimestamp(),
      status: 'APPROVED'
    });
  };

  const handleOverride = async () => {
    if (!user || !stats || !currentRule) return;
    await processCompletion(currentRule);
    setActiveInspector(null);
    setCurrentRule(null);
  };

  const processCompletion = async (rule: Rule, isTimerSuccess: boolean = false) => {
    if (!user || !stats) return;

    let multiplier = 1.0;
    let bonusPoints = 0;
    let newStreak = stats.streak_days;
    const now = new Date();
    const lastDate = stats.last_completion_date?.toDate();

    // Streak Logic
    if (lastDate) {
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        newStreak += 1;
        if (newStreak >= 3) multiplier = 1.5;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Speedster Bonus
    if (rule.validation_method === 'Timer' || isTimerSuccess) {
      bonusPoints = 2;
    }

    const basePoints = Math.round(rule.point_value * multiplier);
    const totalPoints = basePoints + bonusPoints;

    // Update Stats
    await setDoc(doc(db, 'users', user.uid, 'stats', 'current'), {
      ...stats,
      current_points: stats.current_points + totalPoints,
      streak_days: newStreak,
      last_completion_date: serverTimestamp()
    });

    // Add to History
    await addDoc(collection(db, 'users', user.uid, 'history'), {
      task: rule.action,
      points_awarded: totalPoints,
      multiplier,
      timestamp: serverTimestamp(),
      status: 'APPROVED'
    });

    // CELEBRATION!
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981']
    });
  };

  const handleReset = async () => {
    if (!user || !stats) return;
    if (!window.confirm(`Are you sure you want to reset ${profile.kidName}'s points?`)) return;

    await setDoc(doc(db, 'users', user.uid, 'stats', 'current'), {
      ...stats,
      current_points: 0,
      streak_days: 0,
      last_completion_date: null
    });
  };

  const handleUpdateStats = async (updates: Partial<UserStats>) => {
    if (!user || !stats) return;
    await setDoc(doc(db, 'users', user.uid, 'stats', 'current'), {
      ...stats,
      ...updates
    });
  };

  if (!user) return <Auth />;

  return (
    <div className={cn(
      "min-h-screen pb-20 selection:bg-indigo-100 transition-colors duration-500",
      viewMode === 'kid' ? "bg-bubbles" : "bg-slate-50"
    )}>
      <Auth showSignOut={viewMode === 'admin'} />
      
      {/* Header Section */}
      <div className={cn(
        "text-white pt-24 sm:pt-16 pb-20 sm:pb-28 px-4 sm:px-6 rounded-b-[3rem] sm:rounded-b-[4rem] shadow-2xl relative overflow-hidden transition-all duration-700",
        viewMode === 'kid' ? "bg-playful-gradient" : "bg-slate-900"
      )}>
        {/* Decorative elements for kids */}
        {viewMode === 'kid' && (
          <>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" 
            />
            <motion.div 
              animate={{ y: [0, 20, 0] }} 
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-40 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl" 
            />
          </>
        )}
        {/* Toggle Mode for Admin */}
        <div className="absolute top-6 left-4 sm:left-6 z-50">
          <button
            onClick={() => setViewMode(viewMode === 'admin' ? 'kid' : 'admin')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10"
          >
            {viewMode === 'admin' ? 'Parent Dashboard' : 'Kid View'}
          </button>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          {viewMode === 'kid' && (
            <>
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 mb-8 sm:mb-10 text-center sm:text-left"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  className="bg-white/20 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] backdrop-blur-xl border border-white/20 shadow-xl animate-float"
                >
                  <Trophy className="text-yellow-300 drop-shadow-lg w-8 h-8 sm:w-12 sm:h-12" />
                </motion.div>
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <Sparkles className="text-yellow-300 animate-pulse" size={16} />
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase drop-shadow-lg">EARN IT</h1>
                  </div>
                  <p className="text-white/80 font-black text-sm sm:text-lg tracking-widest uppercase italic">
                    Go for it, {profile.kidName}! ✨
                  </p>
                </div>
              </motion.div>

              {stats && (
                <TokenJar 
                  currentPoints={stats.current_points}
                  targetGoal={stats.target_goal}
                  streakDays={stats.streak_days}
                  rewardDescription={stats.active_reward}
                  theme={stats.visual_theme}
                  kidName={profile.kidName}
                />
              )}
            </>
          )}
          {viewMode === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6 mb-10"
            >
              <div className="bg-indigo-500/20 p-5 rounded-[2rem] backdrop-blur-xl border border-white/10">
                <Settings size={40} className="text-indigo-400" />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter uppercase mb-1">EARNIT</h1>
                <p className="text-slate-400 font-bold text-sm tracking-wide">Parent Command Center</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 -mt-12 space-y-8">
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setShowHistory(false)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap shadow-md",
              !showHistory ? "bg-blue-600 text-white" : "bg-white text-gray-500"
            )}
          >
            <Gamepad2 size={20} />
            Daily Missions
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap shadow-md",
              showHistory ? "bg-blue-600 text-white" : "bg-white text-gray-500"
            )}
          >
            <History size={20} />
            Mission History
          </button>
          {viewMode === 'admin' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-white text-red-500 hover:bg-red-50 shadow-md transition-all whitespace-nowrap"
            >
              <RefreshCcw size={20} />
              Reset Goal
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="missions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <RuleLibrary 
                rules={rules}
                onAddRule={handleAddRule}
                onUpdateRule={handleUpdateRule}
                onDeleteRule={handleDeleteRule}
                onCompleteTask={handleCompleteTask}
                onPointCorrection={handlePointCorrection}
                onOverride={handleOverride}
                isAdmin={viewMode === 'admin'}
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
                stats={stats}
                onUpdateStats={handleUpdateStats}
              />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100"
            >
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Mission Log</h3>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-gray-400 text-center py-12 font-medium">No missions completed yet. Let's go, {profile.kidName}!</p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                      <div>
                        <h4 className="font-bold text-gray-800">{item.task}</h4>
                        <p className="text-xs text-gray-400">{item.timestamp?.toDate().toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-green-600">
                          {item.points_awarded > 0 ? `+${item.points_awarded}` : item.points_awarded} pts
                        </div>
                        {item.multiplier > 1 && (
                          <div className="text-xs font-bold text-orange-500 flex items-center gap-1 justify-end">
                            <Flame size={12} />
                            {item.multiplier}x Streak Bonus!
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Vision Inspector Modal */}
      {activeInspector && currentRule && (
        <VisionInspector 
          type={activeInspector}
          onSuccess={() => processCompletion(currentRule)}
          onCancel={() => {
            setActiveInspector(null);
            setCurrentRule(null);
          }}
          kidName={profile.kidName}
        />
      )}

      {/* Footer / Status */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-gray-100 p-4 flex justify-around items-center z-40">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black text-blue-600">{stats?.current_points || 0}</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Points</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black text-orange-500">{stats?.streak_days || 0}</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Streak</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-black text-indigo-600">{Math.round(((stats?.current_points || 0) / (stats?.target_goal || 50)) * 100)}%</div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</div>
        </div>
      </div>
    </div>
  );
}
