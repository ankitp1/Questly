import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Video, Image as ImageIcon, Loader2, Play, Download, Sparkles, AlertCircle, Key, X } from 'lucide-react';

interface MarketingKitProps {
  kidName: string;
  onClose: () => void;
}

export function MarketingKit({ kidName, onClose }: MarketingKitProps) {
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isImagesLoading, setIsImagesLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(selected);
    };
    checkKey();
  }, []);

  const openKeyDialog = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasKey(true);
  };

  const generateThumbnails = async () => {
    setIsImagesLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompts = [
        `A professional, high-end YouTube thumbnail for an app called Earn It. A sleek dashboard showing a progress bar for ${kidName}, a modern target icon, and clean typography. 'BUILD BETTER HABITS'. Minimalist, sophisticated, 4k.`,
        `A sleek App Store screenshot for Earn It. A clean, white interface with indigo accents, showing a list of daily tasks and a progress dashboard for ${kidName}. Modern, professional design.`,
        `A cinematic 3D render of a modern target icon with an arrow in the center. Sleek metallic finish, indigo and slate colors, professional lighting, 4k.`
      ];

      const generatedImages: string[] = [];
      for (const prompt of prompts) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: "16:9" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            generatedImages.push(`data:image/png;base64,${part.inlineData.data}`);
          }
        }
      }
      setThumbnails(generatedImages);
    } catch (err: any) {
      console.error("Thumbnail generation failed:", err);
      setError("Failed to generate thumbnails. Please try again.");
    } finally {
      setIsImagesLoading(false);
    }
  };

  const generateVideo = async () => {
    if (!hasKey) {
      await openKeyDialog();
      return;
    }

    setIsVideoLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY! });
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-lite-generate-preview',
        prompt: `A professional, high-end highlight reel for an app called Earn It. The video shows a clean, minimalist dashboard with a progress bar for ${kidName}, a modern target icon, and sleek typography. The camera pans smoothly across the interface, highlighting the 'Verification' feature and the 'Reward' system. Sophisticated lighting, indigo and slate color palette, 4k.`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await (ai as any).operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = (operation as any).response?.generatedVideos?.[0]?.video?.uri;
      if (downloadLink) {
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': (process.env as any).API_KEY || process.env.GEMINI_API_KEY!,
          },
        });
        const blob = await response.blob();
        setVideoUrl(URL.createObjectURL(blob));
      }
    } catch (err: any) {
      console.error("Video generation failed:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key issue. Please select your key again.");
      } else {
        setError("Failed to generate video. This can take a few minutes.");
      }
    } finally {
      setIsVideoLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-white rounded-[3rem] max-w-4xl w-full shadow-2xl relative overflow-hidden my-8">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
          <div>
            <h3 className="text-3xl font-black flex items-center gap-3 uppercase tracking-tighter">
              <Sparkles className="text-indigo-400" />
              Earn It Marketing Kit
            </h3>
            <p className="text-slate-400 font-bold text-sm tracking-wide mt-1">Generate professional assets for your launch.</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-10 space-y-16">
          {error && (
            <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-center gap-3 text-red-600 font-bold">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Video Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <Video className="text-indigo-600" />
                Highlight Reel
              </h4>
              {!videoUrl && !isVideoLoading && (
                <button
                  onClick={generateVideo}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-3 rounded-xl text-xs transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  {hasKey ? "Generate Video" : "Select API Key"}
                </button>
              )}
            </div>

            <div className="aspect-video bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
              {isVideoLoading ? (
                <div className="text-center space-y-4 p-8">
                  <Loader2 className="animate-spin mx-auto text-indigo-500" size={48} />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Generating highlight reel...</p>
                  <p className="text-xs text-slate-400 italic">"Excellence is a habit, not an act."</p>
                </div>
              ) : videoUrl ? (
                <video src={videoUrl} controls className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400 space-y-2">
                  <Play size={48} className="mx-auto opacity-20" />
                  <p className="font-bold">No video generated yet</p>
                  {!hasKey && (
                    <p className="text-xs text-blue-500 font-bold">
                      Note: Video generation requires a paid Gemini API key. 
                      <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">Learn more</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Thumbnails Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
                <ImageIcon className="text-indigo-600" />
                Marketing Assets
              </h4>
              <button
                onClick={generateThumbnails}
                disabled={isImagesLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-3 rounded-xl text-xs transition-all disabled:bg-slate-200 uppercase tracking-widest"
              >
                {isImagesLoading ? "Generating..." : "Generate Assets"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isImagesLoading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="aspect-video bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center border border-slate-100">
                    <Loader2 className="animate-spin text-indigo-200" />
                  </div>
                ))
              ) : thumbnails.length > 0 ? (
                thumbnails.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
                  >
                    <img src={src} alt={`Thumbnail ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={src} download={`earnit-asset-${i}.png`} className="bg-white text-slate-900 p-3 rounded-full shadow-xl">
                        <Download size={20} />
                      </a>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem]">
                  <ImageIcon size={48} className="mx-auto opacity-10 mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">Generate assets for your launch</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-16 py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </motion.div>
  );
}
