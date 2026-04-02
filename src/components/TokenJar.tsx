import { motion } from 'motion/react';
import { Trophy, Flame, Star, Sparkles } from 'lucide-react';

interface TokenJarProps {
  currentPoints: number;
  targetGoal: number;
  streakDays: number;
  rewardDescription: string;
  theme: string;
  kidName: string;
}

export function TokenJar({ currentPoints, targetGoal, streakDays, rewardDescription, theme, kidName }: TokenJarProps) {
  const progress = Math.min((currentPoints / targetGoal) * 100, 100);

  return (
    <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border-4 border-indigo-100 relative overflow-hidden">
      {/* Decorative background stars */}
      <Star className="absolute -top-4 -right-4 text-yellow-200 opacity-50 rotate-12 w-16 h-16 sm:w-20 sm:h-20" />
      <Star className="absolute -bottom-4 -left-4 text-indigo-100 opacity-50 -rotate-12 w-12 h-12 sm:w-16 sm:h-16" />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 sm:mb-10 relative z-10">
        <div className="w-full sm:w-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 sm:gap-4 tracking-tighter uppercase">
            <div className="bg-yellow-400 p-2.5 sm:p-3 rounded-2xl shadow-lg rotate-3 shrink-0">
              <Trophy className="text-white w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <span className="truncate">{kidName}'s Progress</span>
          </h2>
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className="text-indigo-400 shrink-0" size={16} />
            <p className="text-slate-500 font-black text-xs sm:text-sm uppercase tracking-widest truncate">
              Goal: <span className="text-indigo-600 underline decoration-yellow-400 decoration-4 underline-offset-4">{rewardDescription}</span>
            </p>
          </div>
        </div>
        
        {streakDays >= 1 && (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="bg-orange-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-[1.5rem] sm:rounded-[2rem] flex items-center gap-2 sm:gap-3 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl border-4 border-orange-200 shrink-0"
          >
            <Flame size={18} className="animate-pulse" />
            {streakDays} Day Streak!
          </motion.div>
        )}
      </div>

      <div className="relative h-8 sm:h-10 bg-slate-100 rounded-full p-1 sm:p-1.5 shadow-inner mb-6 sm:mb-8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 10 }}
          className="h-full bg-playful-gradient rounded-full relative shadow-lg"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-white/20 rounded-full h-1/2 mt-0.5 ml-2 mr-2" />
          
          {/* Progress bubble */}
          {progress > 5 && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full shadow-md" 
            />
          )}
        </motion.div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter flex items-baseline gap-2"
        >
          {currentPoints} 
          <span className="text-slate-300 text-xl sm:text-2xl font-black">/ {targetGoal}</span>
          <span className="text-indigo-500 text-sm sm:text-xl ml-1 sm:ml-2 uppercase tracking-widest font-black">Points</span>
        </motion.div>
        
        <div className="text-center sm:text-right">
          <p className="text-xs sm:text-sm font-black text-indigo-600 uppercase tracking-widest mb-1">
            {progress >= 100 ? "🎉 GOAL REACHED! 🎉" : "Keep going!"}
          </p>
          <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {progress >= 100 ? "Time for your reward!" : `${Math.round(targetGoal - currentPoints)} more to go!`}
          </div>
        </div>
      </div>
    </div>
  );
}
