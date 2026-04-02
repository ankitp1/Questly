import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, RefreshCcw, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { inspectRoom, inspectPlate } from '../services/gemini';

interface VisionInspectorProps {
  type: 'Room' | 'Plate';
  onSuccess: () => void;
  onCancel: () => void;
  kidName: string;
}

export function VisionInspector({ type, onSuccess, onCancel, kidName }: VisionInspectorProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setCapturedImage(imageSrc);
    setIsProcessing(true);
    const base64 = imageSrc.split(',')[1];

    try {
      let inspectionResult;
      if (type === 'Room') {
        // For simplicity, we use a placeholder reference image or just the current one for now
        // In a real app, you'd store a reference image in Firestore
        inspectionResult = await inspectRoom(base64, base64); 
      } else {
        inspectionResult = await inspectPlate(base64);
      }
      setResult(inspectionResult);
    } catch (error) {
      console.error("Inspection failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [type]);

  const handleSuccess = () => {
    onSuccess();
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl relative">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-playful-gradient text-white">
          <h3 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter drop-shadow-md">
            <Camera className="text-white" />
            {type} Scanner
          </h3>
          <button onClick={onCancel} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-all font-black text-xs uppercase tracking-widest">Cancel</button>
        </div>

        <div className="relative aspect-video bg-slate-900">
          {!capturedImage ? (
            <Webcam
              {...({
                audio: false,
                ref: webcamRef,
                screenshotFormat: "image/jpeg",
                className: "w-full h-full object-cover"
              } as any)}
            />
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}

          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white p-10 text-center"
              >
                <motion.div
                  animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6 text-indigo-400"
                >
                  <Loader2 size={64} className="animate-spin" />
                </motion.div>
                <p className="text-2xl font-black uppercase tracking-widest mb-2">Scanning for Awesome...</p>
                <p className="text-slate-400 font-bold italic">"The AI is looking for your hard work!"</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-10 text-center bg-bubbles">
          {!result ? (
            <div className="space-y-6">
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Point the camera at your work!</p>
              <button
                onClick={capture}
                disabled={isProcessing}
                className="bg-playful-gradient hover:opacity-90 text-white font-black text-2xl py-8 px-16 rounded-[2.5rem] shadow-2xl transition-all active:scale-95 flex items-center gap-4 mx-auto uppercase tracking-widest border-4 border-white/20"
              >
                <Camera size={32} />
                Scan Now!
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-8xl flex justify-center drop-shadow-xl`}
              >
                {result.needs_parent_review ? (
                  <div className="bg-indigo-100 p-6 rounded-[2.5rem] text-indigo-600 rotate-3">
                    <AlertCircle size={80} />
                  </div>
                ) : (result.isClean || result.isEmpty) ? (
                  <div className="bg-emerald-100 p-6 rounded-[2.5rem] text-emerald-600 -rotate-3">
                    <CheckCircle size={80} />
                  </div>
                ) : (
                  <div className="bg-orange-100 p-6 rounded-[2.5rem] text-orange-600 rotate-6">
                    <XCircle size={80} />
                  </div>
                )}
              </motion.div>
              
              <div className="space-y-3">
                <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                  {result.needs_parent_review ? "Review Time!" : (result.isClean || result.isEmpty) ? `Great Job, ${kidName}! ✨` : "Almost There!"}
                </h4>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <p className="text-xl text-slate-600 font-bold leading-relaxed italic">"{result.feedback}"</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setResult(null); setCapturedImage(null); }}
                  className="flex-1 bg-white hover:bg-slate-50 text-slate-400 font-black py-6 rounded-[2rem] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest border-2 border-slate-100 shadow-sm"
                >
                  <RefreshCcw size={18} />
                  Try Again
                </button>
                {(result.isClean || result.isEmpty) && (
                  <button
                    onClick={handleSuccess}
                    className="flex-[2] bg-playful-gradient hover:opacity-90 text-white font-black py-6 rounded-[2rem] transition-all shadow-2xl text-xl uppercase tracking-widest border-4 border-white/20 animate-bounce"
                  >
                    Claim Your Reward! 🎁
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
