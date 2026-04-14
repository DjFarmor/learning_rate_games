import React from 'react';
import { LogOut, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  game: string;
  currentTrial: number;
  totalTrials: number;
  bestScore: number;
  timeDisplay: string;
  instructions?: string;
  showInstructions?: boolean;
  timeLabel?: string;
  trialLabel?: string;
  trialDisplayOverride?: string;
  scoreValue?: string;
  scoreLabel?: string;
  onExit: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  game,
  currentTrial,
  totalTrials,
  bestScore,
  timeDisplay,
  instructions,
  showInstructions,
  timeLabel = 'Time',
  trialLabel = 'Trial',
  trialDisplayOverride,
  scoreValue,
  scoreLabel = 'Score',
  onExit
}) => {
  return (
    <div className="h-24 bg-zinc-900/50 backdrop-blur border-b border-zinc-800 px-8 flex justify-between items-center z-20 shrink-0">
      <div className="flex items-center gap-6">
        <button 
          onClick={onExit}
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
        >
          <LogOut className="w-3 h-3" />
          Exit
        </button>
        <div className="bg-zinc-950/50 border border-zinc-800 px-4 py-2 rounded-xl">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold block mb-0.5">{trialLabel}</span>
          <span className="text-white font-black tracking-tighter">
            {trialDisplayOverride || `${currentTrial} / ${totalTrials}`}
          </span>
        </div>
        <div className="bg-zinc-950/50 border border-zinc-800 px-4 py-2 rounded-xl">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold block mb-0.5">{timeLabel}</span>
          <span className="text-white font-black tracking-tighter tabular-nums">{timeDisplay}</span>
        </div>
        {scoreValue !== undefined && (
          <div className="bg-zinc-950/50 border border-zinc-800 px-4 py-2 rounded-xl">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold block mb-0.5">{scoreLabel}</span>
            <span className="text-white font-black tracking-tighter tabular-nums">{scoreValue}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        <h2 className="text-xl font-black tracking-tighter text-white uppercase">{game}</h2>
        {instructions && (
          <div className={cn(
            "flex items-center gap-2 transition-all duration-500",
            showInstructions ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}>
            <Info className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">{instructions}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold block mb-0.5">Best Score</span>
          <span className="text-emerald-500 font-black tracking-tighter">
            {bestScore.toFixed(1)}{game === 'Finger Tapping' ? '' : '%'}
          </span>
        </div>
      </div>
    </div>
  );
};
