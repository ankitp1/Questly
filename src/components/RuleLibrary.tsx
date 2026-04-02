import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, CheckCircle2, Camera, Timer, UserCircle, X, Info, Flame, Volume2, Settings } from 'lucide-react';
import { useState } from 'react';
import { parseCommand, textToSpeech } from '../services/gemini';

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
  onUpdateProfile
}: RuleLibraryProps) {
  const [commandText, setCommandText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const playPCM = async (base64Data: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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

  const speakTask = async (rule: Rule) => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const text = `${rule.task_name}. ${rule.action}. You will earn ${rule.point_value} points!`;
      const base64Audio = await textToSpeech(text);
      if (base64Audio) {
        await playPCM(base64Audio);
      }
    } catch (error) {
      console.error("Failed to speak task:", error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleCommand = async () => {
    if (!commandText.trim()) return;
    setIsParsing(true);
    try {
      const result = await parseCommand(commandText);
      
      if (result.intent === 'CREATE_RULE') {
        onAddRule({
          task_name: result.task_name || result.action,
          action: result.action,
          point_value: result.point_value,
          validation_method: result.validation_method,
          emoji: result.emoji
        });
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
        <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserCircle className="text-blue-500" />
              {profile.adminName}'s Command Center
            </h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6 space-y-4 border-b-2 border-gray-50 pb-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Name</label>
                    <input
                      type="text"
                      value={profile.adminName}
                      onChange={(e) => onUpdateProfile({ adminName: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-400 font-bold text-gray-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kid's Name</label>
                    <input
                      type="text"
                      value={profile.kidName}
                      onChange={(e) => onUpdateProfile({ kidName: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-400 font-bold text-gray-700"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <input
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="Add rule, correction, or override..."
              className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-400 transition-all"
            />
            <button
              onClick={handleCommand}
              disabled={isParsing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-6 py-3 rounded-2xl transition-all flex items-center gap-2"
            >
              {isParsing ? "..." : <Plus size={24} />}
              Send
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {rules.map((rule) => (
        <motion.button
          key={rule.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setSelectedRule(rule);
            speakTask(rule);
          }}
          className="bg-white rounded-[2.5rem] p-6 shadow-xl border-4 border-blue-50 flex flex-col items-center justify-center gap-3 relative overflow-hidden group"
        >
          <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
            {rule.emoji}
          </div>
          <div className="text-center">
            <div className="font-black text-gray-800 text-sm uppercase tracking-tight leading-tight mb-1">
              {rule.task_name}
            </div>
            <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full inline-block">
              {rule.point_value} PTS
            </div>
          </div>
          {rule.validation_method === 'Image' && (
            <div className="absolute top-3 right-3 text-blue-400">
              <Camera size={16} />
            </div>
          )}
          {rule.validation_method === 'Timer' && (
            <div className="absolute top-3 right-3 text-orange-400">
              <Timer size={16} />
            </div>
          )}
          <div className="absolute bottom-3 right-3 text-gray-200 group-hover:text-blue-400 transition-colors">
            <Volume2 size={16} />
          </div>
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
              className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl relative border-8 border-blue-100"
            >
              <button
                onClick={() => setSelectedRule(null)}
                className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-all"
              >
                <X size={32} />
              </button>

              <div className="text-center space-y-6">
                <div className="text-8xl mb-4">{selectedRule.emoji}</div>
                <div className="flex items-center justify-center gap-3">
                  <h3 className="text-3xl font-black text-gray-800 uppercase tracking-tight">
                    {selectedRule.task_name}
                  </h3>
                  <button 
                    onClick={() => speakTask(selectedRule)}
                    className="text-blue-500 hover:text-blue-600 transition-colors"
                    disabled={isSpeaking}
                  >
                    <Volume2 size={24} />
                  </button>
                </div>
                
                <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100">
                  <p className="text-xl font-bold text-blue-800 leading-tight">
                    {selectedRule.action}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-orange-500 font-bold bg-orange-50 py-3 px-6 rounded-2xl border-2 border-orange-100">
                  <Flame size={24} />
                  <span>3 DAY STREAK = 1.5x BONUS! 🔥</span>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => {
                      onCompleteTask(selectedRule);
                      setSelectedRule(null);
                    }}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-2xl py-6 rounded-[2rem] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 size={32} />
                    LET'S DO IT!
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
