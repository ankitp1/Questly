import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Camera, Timer, UserCircle, X, Info, Flame, Volume2, Settings, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { parseCommand, textToSpeech } from '../services/gemini';
import { cn } from '../lib/utils';

interface Rule {
  id: string;
  task_name: string;
  action: string;
  point_value: number;
  validation_method: 'Image' | 'Timer' | 'Manual';
  emoji: string;
}

interface UserProfile {
  adminName: string;
  kidName: string;
}

interface UserStats {
  current_points: number;
  target_goal: number;
  streak_days: number;
  last_completion_date: any;
  active_reward: string;
  visual_theme: string;
}

interface RuleLibraryProps {
  rules: Rule[];
  onAddRule: (rule: Omit<Rule, 'id'>) => void;
  onUpdateRule: (id: string, updates: Partial<Rule>) => void;
  onDeleteRule: (id: string) => void;
  onCompleteTask: (rule: Rule) => void;
  onPointCorrection: (points: number, type: 'ADD' | 'REMOVE') => void;
  onOverride: () => void;
  isAdmin: boolean;
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  stats: UserStats | null;
  onUpdateStats: (updates: Partial<UserStats>) => void;
}

export function RuleLibrary({ 
  rules, 
  onAddRule, 
  onUpdateRule, 
  onDeleteRule, 
  onCompleteTask, 
  onPointCorrection, 
  onOverride, 
  isAdmin,
  profile,
  onUpdateProfile,
  stats,
  onUpdateStats
}: RuleLibraryProps) {
  const [commandText, setCommandText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audioCache] = useState<Map<string, string>>(new Map());
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [newRuleIds] = useState<Set<string>>(new Set());

  const systemSpeak = (text: string) => {
    // Stop any current speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  };

  const playPCM = async (base64Data: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // CRITICAL for mobile: Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const arrayBuffer = bytes.buffer;
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const testSound = async () => {
    try {
      const base64Audio = await textToSpeech("Sound system active! Ready for mission control.");
      if (base64Audio) {
        await playPCM(base64Audio);
      }
    } catch (error) {
      console.error("Sound test failed:", error);
    }
  };

  const speakTask = async (rule: Rule) => {
    const text = `${rule.task_name}. ${rule.action}. You will earn ${rule.point_value} points!`;

    // 1. Check cache first (instant)
    if (audioCache.has(rule.id)) {
      playPCM(audioCache.get(rule.id)!);
      return;
    }

    // 2. Only use Gemini TTS for "new" rules created in this session
    // or if the user explicitly clicks "Listen" and we haven't hit quota
    const shouldTryGemini = (newRuleIds.has(rule.id) || newRuleIds.has(rule.task_name)) && !isQuotaExceeded;

    if (shouldTryGemini) {
      setIsSpeaking(true);
      try {
        const base64Audio = await textToSpeech(text);
        if (base64Audio) {
          audioCache.set(rule.id, base64Audio);
          await playPCM(base64Audio);
          return;
        } else {
          setIsQuotaExceeded(true);
        }
      } catch (error) {
        console.error("Failed to speak task with Gemini:", error);
      } finally {
        setIsSpeaking(false);
      }
    }

    // 3. Fallback to System TTS (Static/Free)
    systemSpeak(text);
  };

  const handleCommand = async () => {
    if (!commandText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseCommand(commandText);
      
      if (result.intent === 'CREATE_RULE') {
        const newRule = {
          task_name: result.task_name || result.action || 'New Mission',
          action: result.action || 'Complete the mission!',
          point_value: result.point_value || 5,
          validation_method: result.validation_method || 'Manual',
          emoji: result.emoji || '✨'
        };
        // We can't know the ID yet since it's generated by Firestore,
        // but we can flag that the NEXT rule added should be treated as "new"
        // Or simpler: just try Gemini for any rule that isn't cached yet if we want.
        // But the user specifically said "only for new entries created".
        // Let's track the names of rules created in this session.
        newRuleIds.add(newRule.task_name); // Using name as a temporary proxy
        onAddRule(newRule);
      } else if (result.intent === 'POINT_CORRECTION') {
        onPointCorrection(result.point_value, result.correction_type);
      } else if (result.intent === 'OVERRIDE') {
        onOverride();
      }
      
      setCommandText('');
    } catch (error) {
      console.error("Failed to parse command:", error);
    } finally {
      setIsParsing(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl border-4 border-slate-100 mb-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3 sm:gap-4 tracking-tighter uppercase shrink-0">
              <div className="bg-slate-900 p-2.5 sm:p-3 rounded-2xl shadow-lg rotate-3 shrink-0">
                <UserCircle className="text-white w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <span>{profile.adminName}'s Hub</span>
            </h2>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-400 hover:text-blue-500 transition-colors p-2 shrink-0"
            >
              <Settings size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Name</label>
              <input
                type="text"
                value={profile.adminName}
                onChange={(e) => onUpdateProfile({ adminName: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 font-bold text-slate-700 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kid's Name</label>
              <input
                type="text"
                value={profile.kidName}
                onChange={(e) => onUpdateProfile({ kidName: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 font-bold text-slate-700 transition-all"
              />
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 border-t-2 border-slate-50 pt-8">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Reward</label>
                <input
                  type="text"
                  value={stats.active_reward}
                  onChange={(e) => onUpdateStats({ active_reward: e.target.value })}
                  placeholder="e.g., Trip to the Park"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 font-bold text-slate-700 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Point Goal</label>
                <input
                  type="number"
                  value={stats.target_goal}
                  onChange={(e) => onUpdateStats({ target_goal: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 font-bold text-slate-700 transition-all"
                />
              </div>
            </div>
          )}

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-8 space-y-4 border-t-2 border-slate-50 pt-8"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-blue-50 p-5 rounded-[2rem] border-2 border-blue-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500 p-3 rounded-2xl text-white shadow-md">
                      <Volume2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Audio System</p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Tap to unlock sound on mobile</p>
                    </div>
                  </div>
                  <button
                    onClick={testSound}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white text-xs font-black px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-widest"
                  >
                    TEST SOUND
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="Add rule, correction, or override..."
              className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-400 transition-all font-bold text-slate-700 placeholder:text-slate-300"
            />
            <button
              onClick={handleCommand}
              disabled={isParsing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 shrink-0 uppercase tracking-widest text-sm"
            >
              {isParsing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Plus size={20} />
              )}
              Send
            </button>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center sm:text-left">
            Try: "Add 5 bonus points" • "Remove 2 points" • "Override"
          </p>
        </div>

        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="text-3xl">{rule.emoji}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{rule.task_name}</h4>
                  <p className="text-xs text-gray-400 line-clamp-1">{rule.action}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Points</span>
                  <input
                    type="number"
                    value={rule.point_value}
                    onChange={(e) => onUpdateRule(rule.id, { point_value: parseInt(e.target.value) || 0 })}
                    className="w-16 bg-gray-50 border-2 border-gray-100 rounded-lg px-2 py-1 text-center font-bold text-blue-600 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={() => onDeleteRule(rule.id)}
                  className="text-gray-300 hover:text-red-500 p-2 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getRuleColor = (index: number) => {
    const colors = [
      'bg-blue-50 border-blue-200 text-blue-600',
      'bg-purple-50 border-purple-200 text-purple-600',
      'bg-pink-50 border-pink-200 text-pink-600',
      'bg-orange-50 border-orange-200 text-orange-600',
      'bg-green-50 border-green-200 text-green-600',
      'bg-indigo-50 border-indigo-200 text-indigo-600',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
      {rules.map((rule, index) => (
        <motion.button
          key={rule.id}
          whileHover={{ y: -8, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedRule(rule);
            speakTask(rule);
          }}
          className={cn(
            "rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-lg border-4 flex flex-col items-center justify-center gap-3 sm:gap-4 relative overflow-hidden group transition-all",
            getRuleColor(index)
          )}
        >
          <div className="text-5xl sm:text-7xl group-hover:scale-125 transition-transform duration-500 drop-shadow-md">
            {rule.emoji}
          </div>
          <div className="text-center">
            <div className="font-black text-slate-900 text-[10px] sm:text-sm uppercase tracking-wider mb-1 sm:mb-2 truncate max-w-[120px] sm:max-w-none">
              {rule.task_name}
            </div>
            <div className="bg-white/80 backdrop-blur-sm text-slate-900 text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full inline-block uppercase tracking-widest shadow-sm">
              {rule.point_value} Points
            </div>
          </div>
          {rule.validation_method === 'Image' && (
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-40">
              <Camera size={16} sm:size={20} />
            </div>
          )}
          {rule.validation_method === 'Timer' && (
            <div className="absolute top-3 sm:top-4 right-3 sm:right-4 opacity-40">
              <Timer size={16} sm:size={20} />
            </div>
          )}
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 opacity-20 group-hover:opacity-100 transition-opacity">
            <Volume2 size={16} sm:size={20} className={cn(isQuotaExceeded && "text-slate-300")} />
          </div>
          
          {/* Decorative shine */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:translate-x-40 transition-transform duration-1000" />
        </motion.button>
      ))}

      <AnimatePresence>
        {selectedRule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl relative border border-slate-100"
            >
              <button
                onClick={() => setSelectedRule(null)}
                className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition-all"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-8">
                <div className="text-8xl mb-4">{selectedRule.emoji}</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                      {selectedRule.task_name}
                    </h3>
                    <button 
                      onClick={() => speakTask(selectedRule)}
                      className={cn(
                        "transition-colors",
                        isQuotaExceeded ? "text-slate-300 cursor-not-allowed" : "text-indigo-500 hover:text-indigo-600"
                      )}
                      disabled={isSpeaking || (isQuotaExceeded && !audioCache.has(selectedRule.id))}
                      title={isQuotaExceeded ? "Daily audio limit reached" : "Listen to mission"}
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
                    {selectedRule.point_value} Points Available
                  </p>
                </div>
                
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                  <p className="text-lg font-bold text-slate-600 leading-relaxed">
                    {selectedRule.action}
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      onCompleteTask(selectedRule);
                      setSelectedRule(null);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xl py-6 rounded-[2rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest"
                  >
                    <CheckCircle2 size={24} />
                    Start Mission
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
