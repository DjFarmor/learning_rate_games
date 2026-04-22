import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ArrowRight, Play, RefreshCw, MousePointer2, Keyboard, Brain, ListTodo, Info, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';
import { Dot, GameState } from '../types/game';

interface DotMemoryProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const DotMemory: React.FC<DotMemoryProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'PRE_START' | 'COUNTDOWN' | 'SHOW_DOTS' | 'PLACE_DOTS' | 'FINISHING' | 'SHOW_SOLUTION' | 'SHOW_SOLUTION_HIDE_DOTS'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [maxTrials, setMaxTrials] = useState(10);
  const [dotCount, setDotCount] = useState(6);
  const [presentationTime, setPresentationTime] = useState(3);
  const [solutionTime, setSolutionTime] = useState(3);
  const [dotMemoryGridSize, setDotMemoryGridSize] = useState(0);
  const [backgroundType, setBackgroundType] = useState<'PICSUM' | 'GREY' | 'LOCAL'>('LOCAL');
  const [trialTimeLimit, setTrialTimeLimit] = useState(8);
  
  const [dots, setDots] = useState<Dot[]>([]);
  const [placedDots, setPlacedDots] = useState<Dot[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [bgImage, setBgImage] = useState('');
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(7));
  const [avgRandomDist, setAvgRandomDist] = useState(1);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [showTryAgain, setShowTryAgain] = useState(false);
  const [showDotMemoryInstructions, setShowDotMemoryInstructions] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const placedDotsRef = useRef<Dot[]>([]);
  const isFinishingRef = useRef(false);

  const calculateGreedyAvgDist = useCallback((placed: Dot[], target: Dot[]) => {
    if (placed.length === 0 || target.length === 0) return 100;
    const availableTargets = [...target];
    let totalDist = 0;
    
    for (const p of placed) {
      let minDist = Infinity;
      let bestIdx = -1;
      
      for (let i = 0; i < availableTargets.length; i++) {
        const t = availableTargets[i];
        const d = Math.sqrt(Math.pow(p.x - t.x, 2) + Math.pow(p.y - t.y, 2));
        if (d < minDist) {
          minDist = d;
          bestIdx = i;
        }
      }
      
      if (bestIdx !== -1) {
        totalDist += minDist;
        availableTargets.splice(bestIdx, 1);
      }
    }
    return totalDist / placed.length;
  }, []);

  const generateDots = useCallback(() => {
    const newDots: Dot[] = [];
    for (let i = 0; i < dotCount; i++) {
      let x, y;
      if (dotMemoryGridSize > 0) {
        const cellX = Math.floor(Math.random() * dotMemoryGridSize);
        const cellY = Math.floor(Math.random() * dotMemoryGridSize);
        x = (cellX + 0.5) * (100 / dotMemoryGridSize);
        y = (cellY + 0.5) * (100 / dotMemoryGridSize);
      } else {
        x = 10 + Math.random() * 80;
        y = 10 + Math.random() * 80;
      }
      
      const tooClose = newDots.some(d => Math.sqrt(Math.pow(d.x - x, 2) + Math.pow(d.y - y, 2)) < 8);
      if (tooClose) {
        i--;
        continue;
      }
      newDots.push({ x, y });
    }
    setDots(newDots);
    setPlacedDots([]);
    placedDotsRef.current = [];

    // Calculate random baseline
    const randomAverages: number[] = [];
    for (let s = 0; s < 3; s++) {
      const randomSet: Dot[] = [];
      for (let i = 0; i < dotCount; i++) {
        randomSet.push({ x: Math.random() * 100, y: Math.random() * 100 });
      }
      randomAverages.push(calculateGreedyAvgDist(randomSet, newDots));
    }
    setAvgRandomDist(randomAverages.reduce((a, b) => a + b, 0) / 3);
  }, [dotCount, dotMemoryGridSize, calculateGreedyAvgDist]);

  const startRound = () => {
    isFinishingRef.current = false;
    setGameState('COUNTDOWN');
    setCountdown(3);
    setPlacedDots([]);
    setTimeLeft(trialTimeLimit);
  };

  const finishRound = useCallback(async (isTimeout = false) => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setGameState('FINISHING');

    const duration = Date.now() - startTime;
    
    let finalPlacedDots = [...placedDotsRef.current];
    if (isTimeout && finalPlacedDots.length < dotCount) {
      // Place remaining dots randomly
      const remainingCount = dotCount - finalPlacedDots.length;
      const randomDots: Dot[] = [];
      for (let i = 0; i < remainingCount; i++) {
        randomDots.push({
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80
        });
      }
      finalPlacedDots = [...finalPlacedDots, ...randomDots];
      setPlacedDots(finalPlacedDots);
      placedDotsRef.current = finalPlacedDots;
    }

    const actualAvgDist = calculateGreedyAvgDist(finalPlacedDots, dots);
    const roundScore = Math.max(0, (1 - (actualAvgDist / avgRandomDist)) * 100);
    
    setLastRoundScore(roundScore);
    setShowRoundScore(true);
    setSessionScores(prev => [...prev, roundScore]);

    await saveResult('Dot Memory', {
      attempt: currentGameAttemptId,
      trial,
      score: roundScore,
      time: duration,
      repetitions: maxTrials,
      dots: dotCount,
      countdown_duration: 3,
      presentation_time: presentationTime,
      solution_time: solutionTime,
      trial_time_limit: trialTimeLimit,
      background_type: backgroundType,
      grid_size: dotMemoryGridSize
    });

    setTimeout(() => {
      setShowRoundScore(false);
      setGameState('SHOW_SOLUTION');
      setTimeout(() => {
        if (trial < maxTrials) {
          setTrial(prev => prev + 1);
          setGameState('PRE_START');
          setCountdown(3);
          setPlacedDots([]);
          placedDotsRef.current = [];
          setTimeLeft(trialTimeLimit);
        } else {
          onFinish([...sessionScores, roundScore]);
        }
      }, solutionTime * 1000);
    }, 2000);
  }, [startTime, dotCount, dots, avgRandomDist, saveResult, currentGameAttemptId, trial, maxTrials, presentationTime, solutionTime, trialTimeLimit, backgroundType, dotMemoryGridSize, sessionScores, onFinish, calculateGreedyAvgDist]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameState !== 'PLACE_DOTS' || placedDots.length >= dotCount) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPlaced = [...placedDots, { x, y }];
    setPlacedDots(newPlaced);
    placedDotsRef.current = newPlaced;

    if (newPlaced.length === dotCount) {
      finishRound();
    }
  };

  useEffect(() => {
    if (gameState === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('SHOW_DOTS');
      }
    }
  }, [gameState, countdown]);

  useEffect(() => {
    if (gameState === 'PLACE_DOTS' && trialTimeLimit > 0) {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, trialTimeLimit - elapsed);
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          clearInterval(timer);
          finishRound(true);
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [gameState, startTime, trialTimeLimit, finishRound]);

  useEffect(() => {
    if (gameState === 'SHOW_DOTS') {
      const timer = setTimeout(() => {
        setGameState('PLACE_DOTS');
        setStartTime(Date.now());
      }, presentationTime * 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, presentationTime]);

  useEffect(() => {
    if (gameState === 'SETTINGS') {
      setBgImage(`https://picsum.photos/seed/dm_${sessionSeed}/1920/1080`);
    }
  }, [gameState, sessionSeed]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="dm-settings"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-2xl mx-auto pt-20 px-6 pb-20"
      >
        <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-[3rem] space-y-12 relative">
          <button 
            onClick={onExit}
            className="absolute top-8 left-8 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Exit to Menu
          </button>

          <div className="text-center">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">DOT MEMORY SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Repetitions</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 10, 15, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxTrials(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        maxTrials === n 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Dot Count</label>
                <div className="grid grid-cols-5 gap-2">
                  {[3, 4, 5, 6, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setDotCount(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        dotCount === n 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Presentation Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setPresentationTime(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        presentationTime === n 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {n}s
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Grid Size (0 = None)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 4, 6, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setDotMemoryGridSize(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        dotMemoryGridSize === n 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {n === 0 ? 'Off' : `${n}x${n}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Background</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PICSUM', 'GREY', 'LOCAL'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setBackgroundType(type)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border text-[10px]",
                        backgroundType === type 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Trial Time Limit</label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 4, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setTrialTimeLimit(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border text-[10px]",
                        trialTimeLimit === n 
                          ? "bg-emerald-600 border-emerald-500 text-white" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      {n === 0 ? 'Off' : `${n}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setGameState('INSTRUCTIONS');
              generateDots();
            }}
            className="w-full bg-white text-black font-black py-6 rounded-3xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 text-xl group"
          >
            Continue to Instructions
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    );
  }

  if (gameState === 'INSTRUCTIONS') {
    return (
      <motion.div
        key="dm-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter">DOT MEMORY</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12">
            <p>A set of dots will appear on the screen for <span className="text-white font-bold">{presentationTime} seconds</span>.</p>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl">
              <p className="text-emerald-400 font-bold mb-2 text-sm uppercase tracking-wider">Note:</p>
              <p>The <span className="text-white font-bold uppercase">pattern remains fixed</span> across trials. Your task is to <span className="text-white font-bold uppercase">learn this pattern</span> over time through multiple repetitions.</p>
            </div>
            <p>Memorize their positions as accurately as possible.</p>
            <p>After they disappear, click on the screen where you think the dots were.</p>
            <p>Your score is based on how close your clicks are to the true locations.</p>
          </div>
          <button
            onClick={() => setGameState('PRE_START')}
            className="bg-white text-black font-black px-12 py-6 rounded-3xl hover:bg-zinc-200 transition-all text-xl"
          >
            I'm Ready
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden cursor-crosshair",
        (gameState === 'SHOW_DOTS' || gameState === 'PRE_START') && "cursor-none"
      )}
    >
      <Header
        game="Dot Memory"
        currentTrial={trial}
        totalTrials={maxTrials}
        bestScore={bestScore}
        timeDisplay={gameState === 'PRE_START' ? 'Ready' : (gameState === 'COUNTDOWN' ? countdown.toString() : (gameState === 'SHOW_DOTS' ? presentationTime.toString() + 's' : (gameState === 'SHOW_SOLUTION' || gameState === 'FINISHING' ? 'Solution' : 'Place Dots')))}
        instructions={gameState === 'SHOW_DOTS' ? 'MEMORIZE THE DOTS' : (gameState === 'PLACE_DOTS' ? `${dotCount - placedDots.length} dots left to place` : (gameState === 'PRE_START' ? 'Press any key to start' : (gameState === 'SHOW_SOLUTION' || gameState === 'FINISHING' ? 'True Locations' : '')))}
        showInstructions={showDotMemoryInstructions && (gameState === 'SHOW_DOTS' || gameState === 'PLACE_DOTS' || gameState === 'FINISHING')}
        onExit={onExit}
      />

      <div 
        className="flex-1 w-full relative bg-black flex items-center justify-center p-8"
        ref={containerRef}
        onClick={handleCanvasClick}
      >
        <div 
          className={cn(
            "absolute inset-0 transition-all duration-700",
            backgroundType === 'GREY' ? "bg-zinc-800" : (backgroundType === 'LOCAL' ? "bg-zinc-900" : "opacity-40 grayscale")
          )}
          style={backgroundType !== 'GREY' ? { 
            backgroundImage: `url(${backgroundType === 'LOCAL' ? '/images/chaotic_pattern.png' : bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        />
        
        {gameState === 'PLACE_DOTS' && trialTimeLimit > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-zinc-900/50 z-50">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / trialTimeLimit) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        )}
        
        {dotMemoryGridSize > 0 && (
          <div className="absolute inset-0 pointer-events-none opacity-80">
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.6) 2px, transparent 2px), linear-gradient(to bottom, rgba(255, 255, 255, 0.6) 2px, transparent 2px)`,
                backgroundSize: `${100 / dotMemoryGridSize}% ${100 / dotMemoryGridSize}%`
              }}
            />
          </div>
        )}

        <AnimatePresence>
          {showRoundScore && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
            >
              <div className="bg-emerald-500 text-white px-12 py-6 rounded-[2rem] shadow-2xl border-4 border-white/20 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-70">Round Score</p>
                <p className="text-7xl font-black tracking-tighter">{lastRoundScore.toFixed(1)}%</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === 'PRE_START' && (
          <motion.div
            key="dm-pre-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center cursor-pointer"
            onClick={startRound}
          >
            <div className="text-center bg-zinc-950/30 backdrop-blur-[2px] p-12 rounded-[3rem] border border-white/10">
              <h2 className="text-5xl font-black mb-4 animate-pulse">PRESS ANY KEY TO START</h2>
              <p className="text-zinc-300 uppercase tracking-widest font-bold">Trial {trial} of {maxTrials}</p>
            </div>
          </motion.div>
        )}

        {(gameState === 'SHOW_DOTS' || gameState === 'SHOW_SOLUTION' || gameState === 'FINISHING') && (
          dots.map((dot, i) => (
            <motion.div
              key={`orig-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
            />
          ))
        )}

        {(gameState === 'PLACE_DOTS' || gameState === 'SHOW_SOLUTION' || gameState === 'FINISHING') && (
          placedDots.map((dot, i) => (
            <motion.div
              key={`placed-${i}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 border-2",
                (gameState === 'SHOW_SOLUTION' || gameState === 'FINISHING') ? "border-emerald-500 bg-emerald-500/20" : "border-white bg-white/10"
              )}
              style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
            />
          ))
        )}

        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center">
            <motion.span
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[20vw] font-black text-white"
            >
              {countdown}
            </motion.span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
