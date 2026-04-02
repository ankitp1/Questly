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
        <div className="p-6 border-b-2 border-gray-100 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="text-blue-500" />
            {type} Inspector
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 font-bold">Close</button>
        </div>

        <div className="relative aspect-video bg-gray-900">
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
                className="absolute inset-0 flex flex-col items-center justify-center bg-blue-600/40 backdrop-blur-md text-white"
              >
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="text-xl font-bold">Analyzing your hard work...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-8 text-center">
          {!result ? (
            <button
              onClick={capture}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-2xl py-6 px-12 rounded-full shadow-xl transition-all transform active:scale-90 flex items-center gap-4 mx-auto"
            >
              <Camera size={32} />
              TAKE PICTURE!
            </button>
          ) : (
            <div className="space-y-6">
              <div className={`text-6xl flex justify-center`}>
                {result.needs_parent_review ? (
                  <AlertCircle className="text-blue-500" size={80} />
                ) : (result.isClean || result.isEmpty) ? (
                  <CheckCircle className="text-green-500" size={80} />
                ) : (
                  <XCircle className="text-orange-500" size={80} />
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="text-3xl font-black text-gray-800 uppercase">
                  {result.needs_parent_review ? "MUMMY/DADDY NEED TO LOOK! 👀" : (result.isClean || result.isEmpty) ? `GREAT JOB, ${kidName}! 🎉` : "ALMOST THERE! 🦖"}
                </h4>
                <p className="text-xl text-gray-600 font-medium">{result.feedback}</p>
                {result.needs_parent_review && (
                  <p className="text-sm text-blue-600 font-bold bg-blue-50 py-2 px-4 rounded-full inline-block">
                    Status: PENDING PARENT APPROVAL
                  </p>
                )}
              </div>

              {result.instructions && result.instructions.length > 0 && (
                <div className="bg-blue-50 p-6 rounded-2xl text-left">
                  <p className="font-bold text-blue-800 mb-2">Try these 2 things:</p>
                  <ul className="space-y-2">
                    {result.instructions.map((inst: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-lg font-medium text-blue-700">
                        <span className="bg-blue-200 w-6 h-6 rounded-full flex items-center justify-center text-sm">{i + 1}</span>
                        {inst}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => { setResult(null); setCapturedImage(null); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={20} />
                  Try Again
                </button>
                {(result.isClean || result.isEmpty) && (
                  <button
                    onClick={handleSuccess}
                    className="flex-[2] bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg text-xl"
                  >
                    CLAIM POINTS! 🚀
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
