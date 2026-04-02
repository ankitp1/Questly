import { motion } from 'motion/react';
import { Trophy, Flame } from 'lucide-react';

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
    <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            {kidName}'s Token Jar
          </h2>
          <p className="text-gray-500 font-medium">Working towards: <span className="text-blue-600">{rewardDescription}</span></p>
        </div>
        {streakDays >= 3 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full flex items-center gap-1 font-bold text-sm"
          >
            <Flame size={16} />
            {streakDays} Day Streak!
          </motion.div>
        )}
      </div>

      <div className="relative h-12 bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-200 mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 relative"
        >
          {theme.includes("Stadium") && (
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="flex justify-around items-center h-full">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-white rounded-full" />
                ))}
              </div>
            </div>
          )}
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center font-black text-white mix-blend-difference">
          {currentPoints} / {targetGoal} POINTS
        </div>
      </div>

      <div className="text-center text-sm text-gray-500 font-medium">
        {progress >= 100 ? "Goal Reached! 🚀" : `${Math.round(100 - progress)}% to go!`}
      </div>
    </div>
  );
}
