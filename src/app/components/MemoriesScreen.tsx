import React, { useState } from 'react';
import { ChevronLeft, Plus, Image as ImageIcon, Heart, Camera, Share2, MoreHorizontal, Sparkles } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { motion } from 'framer-motion';
import { i18nT } from '../../lib/i18n';

interface MemoriesScreenProps {
  onBack: () => void;
}

const MotionDiv = motion.div as any;

export const MemoriesScreen: React.FC<MemoriesScreenProps> = ({ onBack }) => {
  const { currentBaby, memories, refreshMemories } = useAppContext();
  
  React.useEffect(() => {
    refreshMemories && refreshMemories();
  }, [currentBaby?.id]);

  return (
    <div className="fit-screen bg-background">
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl h-20 px-8 flex justify-between items-center border-b border-border-gray dark:border-zinc-800/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 text-primary dark:text-zinc-400 hover:scale-110 active:scale-95 transition-all">
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-headline font-black text-foreground tracking-tight">Memories Vault</span>
        </div>
        <button className="p-2 text-secondary hover:scale-110 transition-all">
           <Camera size={24} />
        </button>
      </header>

      <main className="flex-1 pt-24 px-6 pb-20 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto w-full space-y-10">
           
           {/* Vault Hero */}
           <div className="bg-surface p-8 rounded-[3rem] border border-border-gray dark:border-zinc-800 text-center space-y-4">
              <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                 <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-headline font-black text-foreground">Timeline of Joy</h2>
              <p className="text-xs text-text-dim max-w-[220px] mx-auto leading-relaxed">
                 A collaborative gallery of captured moments shared between caregivers.
              </p>
           </div>

           <div className="columns-2 gap-4 space-y-4">
              {memories.map((memory, idx) => (
                 <MotionDiv 
                   key={memory.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.1 }}
                   className="break-inside-avoid bg-surface rounded-[2.5rem] p-3 border border-border-gray dark:border-zinc-800 space-y-3 shadow-sm group hover:shadow-xl hover:border-secondary transition-all"
                 >
                    <div className="aspect-[4/5] rounded-[2rem] bg-surface-gray dark:bg-zinc-800 overflow-hidden relative">
                       <img src={memory.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${memory.id}`} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="px-2 pb-2">
                       <p className="text-[8px] font-black text-text-light uppercase tracking-widest mb-1">{new Date(memory.timestamp).toLocaleDateString()}</p>
                       <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-2">{memory.text}</p>
                       <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1.5 text-secondary">
                             <Heart size={12} fill="currentColor" />
                             <span className="text-[9px] font-black">0</span>
                          </div>
                          <button className="text-text-light hover:text-foreground transition-all"><Share2 size={12} /></button>
                       </div>
                    </div>
                 </MotionDiv>
              ))}
           </div>

           <div className="bg-surface-gray dark:bg-zinc-900/50 p-10 rounded-[3.5rem] border border-border-gray dark:border-zinc-800 flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-lg"><ImageIcon size={32} className="text-text-dim" /></div>
              <div className="space-y-2">
                 <p className="text-lg font-headline font-black text-foreground">Fill the Vault</p>
                 <p className="text-[10px] text-text-light font-bold uppercase tracking-widest">Share this baby's invite code to let others add memories.</p>
              </div>
              <button className="btn-primary w-full max-w-[200px]"><span>Invite Partners</span></button>
           </div>
        </div>
      </main>

      {/* Floating Action */}
      <button className="fixed bottom-32 right-8 w-16 h-16 bg-secondary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[60]">
         <Plus size={32} />
      </button>
    </div>
  );
};
