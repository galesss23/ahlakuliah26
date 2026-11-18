import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Instagram, Zap } from 'lucide-react';
import { fetchAppSettings } from '../services/storageService';
import { AppSettings } from '../types';

export const RunningText: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchAppSettings().then(setSettings);
  }, []);

  const text = settings?.runningText || "DUKUNG KAMI DI INSTAGRAM @_BROCODE.ID - SOLUSI JASA PEMROGRAMAN & STANDARISASI APLIKASI TERBAIK!";
  
  return (
    <div className="fixed bottom-0 left-0 w-full bg-slate-950 text-white py-3 overflow-hidden border-t-2 border-indigo-600/30 z-[9999]">
      <div className="flex whitespace-nowrap">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="flex items-center gap-12 pr-12"
        >
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="flex items-center gap-4 group"
            >
              <Zap className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform fill-indigo-500" />
              <span className="font-black text-[10px] tracking-[0.2em] uppercase">{text}</span>
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
          ))}
        </motion.div>
        {/* Duplicate for seamless loop */}
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="flex items-center gap-12 pr-12"
        >
          {[...Array(5)].map((_, i) => (
            <div 
              key={i}
              className="flex items-center gap-4 group"
            >
              <Zap className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform fill-indigo-500" />
              <span className="font-black text-[10px] tracking-[0.2em] uppercase">{text}</span>
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};
