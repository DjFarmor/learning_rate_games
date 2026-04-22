import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LogOut, Info, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';

interface PredictionProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const Prediction: React.FC<PredictionProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'WAITING' | 'COUNTDOWN' | 'GAME'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [totalTrials, setTotalTrials] = useState(10);
  const [reliabilitySet, setReliabilitySet] = useState<'a' | 'b' | 'c' | 'd' | 'random'>('b');
  const [trialDuration, setTrialDuration] = useState(30);
  const [guessTimeLimit, setGuessTimeLimit] = useState(2.0);
  
  const [faces, setFaces] = useState<{emoji: string, reliability: number, suggestion: 'Green' | 'Blue'}[]>([]);
  const [currentTrial, setCurrentTrial] = useState<{boxes: {color: 'Green' | 'Blue', content: 'Gold' | 'Red'}[]} | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<'Gold' | 'Red' | null>(null);
  const [lastChoice, setLastChoice] = useState<'Green' | 'Blue' | null>(null);
  const [goldCount, setGoldCount] = useState(0);
  const [redCount, setRedCount] = useState(0);
  const [trialCount, setPredictionTrialCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [guessTimeRemaining, setGuessTimeRemaining] = useState(2.0);
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [trialReliabilities, setTrialReliabilities] = useState<number[]>([]);
  const [floatingRewards, setFloatingRewards] = useState<{id: number, type: 'Gold' | 'Red' | 'Timeout', x: number}[]>([]);

  const goldCountRef = useRef(0);
  const redCountRef = useRef(0);
  const trialCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const rewardIdRef = useRef(0);
  const feedbackShownRef = useRef(false);

  const initReliabilities = useCallback(() => {
    const sets = {
      a: [0.75, 0.57, 0.43, 0.25],
      b: [0.85, 0.57, 0.43, 0.25],
      c: [0.70, 0.60, 0.50, 0.40],
      d: [0.75, 0.60, 0.40, 0.25]
    };
    
    // If set to random, pick one of the sets a, b, c, d
    const targetSet = reliabilitySet === 'random' 
      ? (['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)] as 'a' | 'b' | 'c' | 'd')
      : reliabilitySet;

    const probs = [...sets[targetSet]].sort(() => Math.random() - 0.5);
    setTrialReliabilities(probs);
    
    const emojis = ['😊', '😎', '🤔', '🧐'].sort(() => Math.random() - 0.5);
    const newFaces = emojis.map((emoji, i) => ({
      emoji,
      reliability: probs[i],
      suggestion: 'Green' as 'Green' | 'Blue'
    }));
    setFaces(newFaces);
    return newFaces;
  }, [reliabilitySet]);

  const generateTrial = useCallback((currentFaces: typeof faces) => {
    const goldBox = Math.random() > 0.5 ? 'Green' : 'Blue';
    const updatedFaces = currentFaces.map(face => {
      const suggestCorrect = Math.random() < face.reliability;
      return {
        ...face,
        suggestion: suggestCorrect ? goldBox : (goldBox === 'Green' ? 'Blue' : 'Green')
      };
    });
    setFaces(updatedFaces);
    setCurrentTrial({
      boxes: [
        { color: 'Green', content: goldBox === 'Green' ? 'Gold' : 'Red' },
        { color: 'Blue', content: goldBox === 'Blue' ? 'Gold' : 'Red' }
      ]
    });
    setShowFeedback(false);
    feedbackShownRef.current = false;
    setLastResult(null);
  }, []);

  const finishTrial = async () => {
    setActive(false);
    const correct = goldCountRef.current;
    const total = trialCountRef.current;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    setLastRoundScore(accuracy);
    setShowRoundScore(true);
    
    // Use a temporary variable to avoid stale state issues and double-appending
    const updatedScores = [...sessionScores, accuracy];
    setSessionScores(updatedScores);

    await saveResult('Prediction', {
      attempt: currentGameAttemptId,
      trial,
      score: accuracy,
      raw_score: goldCountRef.current - redCountRef.current,
      time: Date.now(),
      time_limit: trialDuration,
      guess_time_limit: guessTimeLimit,
      total_trials: totalTrials,
      reliability_set: reliabilitySet,
      advisor_reliabilities: trialReliabilities
    });
  };

  const handleContinue = useCallback(() => {
    if (!showRoundScore) return;
    
    setShowRoundScore(false);
    if (trial < totalTrials) {
      setTrial(prev => prev + 1);
      setCountdown(3);
      setGameState('WAITING');
    } else {
      onFinish([...sessionScores]);
    }
  }, [showRoundScore, trial, totalTrials, onFinish, sessionScores]);

  const handleResponse = (choice: 'Green' | 'Blue') => {
    if (feedbackShownRef.current || !active) return;
    feedbackShownRef.current = true;

    const result = currentTrial?.boxes.find(b => b.color === choice)?.content || 'Red';
    setLastResult(result);
    setLastChoice(choice);
    setShowFeedback(true);
    
    trialCountRef.current += 1;
    setPredictionTrialCount(trialCountRef.current);

    if (result === 'Gold') {
      goldCountRef.current += 1;
      setGoldCount(goldCountRef.current);
    } else {
      redCountRef.current += 1;
      setRedCount(redCountRef.current);
    }

    // Add floating reward
    const newReward = {
      id: rewardIdRef.current++,
      type: result,
      x: choice === 'Green' ? 25 : 75
    };
    setFloatingRewards(prev => [...prev, newReward]);
    setTimeout(() => {
      setFloatingRewards(prev => prev.filter(r => r.id !== newReward.id));
    }, 1000);

    setTimeout(() => {
      generateTrial(faces);
      setLastChoice(null);
      setGuessTimeRemaining(guessTimeLimit);
      setShowFeedback(false);
    }, 200);
  };

  const handleTimeout = useCallback(() => {
    if (feedbackShownRef.current || !active) return;
    feedbackShownRef.current = true;

    setLastResult('Red');
    setLastChoice(null);
    setShowFeedback(true);
    
    trialCountRef.current += 1;
    setPredictionTrialCount(trialCountRef.current);
    redCountRef.current += 1;
    setRedCount(redCountRef.current);

    // Add floating reward
    const newReward = {
      id: rewardIdRef.current++,
      type: 'Timeout' as const,
      x: 50
    };
    setFloatingRewards(prev => [...prev, newReward]);
    setTimeout(() => {
      setFloatingRewards(prev => prev.filter(r => r.id !== newReward.id));
    }, 1000);

    setTimeout(() => {
      generateTrial(faces);
      setLastChoice(null);
      setGuessTimeRemaining(guessTimeLimit);
      setShowFeedback(false);
    }, 200);
  }, [active, showFeedback, generateTrial, faces, guessTimeLimit]);

  const startRound = () => {
    setGoldCount(0);
    setRedCount(0);
    goldCountRef.current = 0;
    redCountRef.current = 0;
    setPredictionTrialCount(0);
    trialCountRef.current = 0;
    
    const initialFaces = initReliabilities();
    generateTrial(initialFaces);
    setTimeRemaining(trialDuration);
    setGuessTimeRemaining(guessTimeLimit);
    setActive(true);
    setGameState('GAME');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'INSTRUCTIONS' && e.code === 'Space') {
        setCountdown(3);
        setGameState('WAITING');
        return;
      }
      if (gameState === 'WAITING' && e.code === 'Space') {
        setGameState('COUNTDOWN');
        return;
      }
      if (showRoundScore && e.code === 'Space') {
        handleContinue();
        return;
      }
      if (gameState === 'GAME' && active && !feedbackShownRef.current) {
        if (e.key === 'ArrowLeft') handleResponse('Green');
        if (e.key === 'ArrowRight') handleResponse('Blue');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, active, showFeedback, handleContinue]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startRound();
      }
    }
  }, [gameState, countdown]);

  useEffect(() => {
    if (active && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0.1) {
            clearInterval(timer);
            finishTrial();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [active]);

  useEffect(() => {
    if (!active || showFeedback || gameState !== 'GAME') return;

    const timer = setInterval(() => {
      setGuessTimeRemaining(prev => {
        if (prev <= 0.1) {
          clearInterval(timer);
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [active, showFeedback, gameState, handleTimeout]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="pr-settings"
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
            <h2 className="text-4xl font-black mb-4 tracking-tighter text-white uppercase">PREDICTION SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Reliability Set</label>
              <div className="grid grid-cols-5 gap-2">
                {['a', 'b', 'c', 'd', 'random'].map(set => (
                  <button
                    key={set}
                    onClick={() => setReliabilitySet(set as any)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border uppercase",
                      reliabilitySet === set ? "bg-rose-600 border-rose-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {set}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Trial Duration (Seconds)</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 20, 30, 45].map(n => (
                  <button
                    key={n}
                    onClick={() => setTrialDuration(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      trialDuration === n ? "bg-rose-600 border-rose-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Guess Time Limit</label>
              <div className="grid grid-cols-5 gap-2">
                {[1.0, 1.5, 2.0, 2.5, 3.0].map(n => (
                  <button
                    key={n}
                    onClick={() => setGuessTimeLimit(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      guessTimeLimit === n ? "bg-rose-600 border-rose-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Repetitions</label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setTotalTrials(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      totalTrials === n ? "bg-rose-600 border-rose-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setGameState('INSTRUCTIONS')}
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
        key="pr-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter text-white">PREDICTION</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12">
            <p>Predict which box contains the <span className="text-amber-500 font-bold uppercase">Gold</span>.</p>
            <p>Four advisors give suggestions. Your goal is to determine <span className="text-rose-500 font-bold uppercase tracking-tight">which of the advisors to trust</span>.</p>
            <p>If you follow the most <span className="text-rose-500 font-bold">RELIABLE</span> advisor (the one with highest accuracy), you will score more points.</p>
            <p>Use <span className="text-white font-bold">LEFT</span> and <span className="text-white font-bold">RIGHT</span> arrow keys to select a box.</p>
            <p>You have <span className="text-white font-bold">{guessTimeLimit}s</span> per guess.</p>
          </div>
          <button
            onClick={() => {
              setCountdown(3);
              setGameState('WAITING');
            }}
            className="bg-white text-black font-black px-12 py-6 rounded-3xl hover:bg-zinc-200 transition-all text-xl"
          >
            I'm Ready (Space)
          </button>
        </div>
      </motion.div>
    );
  }

  if (gameState === 'WAITING') {
    return (
      <motion.div
        key="pr-waiting"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div 
          className="text-center cursor-pointer"
          onClick={() => setGameState('COUNTDOWN')}
        >
          <h2 className="text-4xl font-black mb-4 tracking-tighter text-white uppercase">TRIAL {trial}</h2>
          <p className="text-zinc-400 text-xl animate-pulse">Press Space to start the countdown</p>
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
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden"
    >
      <Header
        game="Prediction"
        currentTrial={trial}
        totalTrials={totalTrials}
        bestScore={bestScore}
        timeDisplay={`${timeRemaining.toFixed(1)}s`}
        scoreValue={(goldCount - redCount).toString()}
        scoreLabel="Net Gold"
        onExit={onExit}
      />

      <div className="flex-1 w-full relative bg-black flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl grid grid-cols-4 gap-4 mb-20">
          {faces.map((face, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex flex-col items-center gap-4">
              <span className="text-6xl">{face.emoji}</span>
              <div className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest",
                face.suggestion === 'Green' ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-500/20 text-blue-500"
              )}>
                {face.suggestion}
              </div>
            </div>
          ))}
        </div>

        <div className="relative mb-20 w-full max-w-2xl h-64 flex gap-8">
          {floatingRewards.map((reward) => (
            <motion.div
              key={reward.id}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ y: -150, opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute z-[60] pointer-events-none flex flex-col items-center"
              style={{ left: `${reward.x}%`, top: '50%' }}
            >
              <div className={cn(
                "text-7xl font-black drop-shadow-2xl",
                reward.type === 'Gold' ? "text-amber-400" : "text-rose-500"
              )}>
                {reward.type === 'Gold' ? '💰' : reward.type === 'Red' ? '❌' : '⏰'}
              </div>
            </motion.div>
          ))}

          {['Green', 'Blue'].map((color) => (
            <button
              key={color}
              onClick={() => handleResponse(color as any)}
              disabled={feedbackShownRef.current || !active}
              className={cn(
                "flex-1 rounded-[3rem] border-4 transition-all flex items-center justify-center relative overflow-hidden group",
                color === 'Green' ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500" : "bg-blue-950/20 border-blue-500/30 hover:border-blue-500",
                lastChoice === color && "scale-105 border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              )}
            >
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity",
                color === 'Green' ? "bg-emerald-500" : "bg-blue-500"
              )} />
            </button>
          ))}
        </div>

        <div className="w-full max-w-2xl h-2 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-rose-500"
            initial={{ width: '100%' }}
            animate={{ width: `${(guessTimeRemaining / guessTimeLimit) * 100}%` }}
            transition={{ duration: 0.1, ease: 'linear' }}
          />
        </div>

        <AnimatePresence>
          {showRoundScore && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center z-[100] bg-black/60 backdrop-blur-md"
            >
              <div className="bg-zinc-900 border border-zinc-800 text-white p-12 rounded-[3rem] shadow-2xl text-center max-w-xl w-full mx-6">
                <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-70">Trial Accuracy</p>
                <p className="text-7xl font-black tracking-tighter mb-8">{lastRoundScore.toFixed(1)}%</p>
                
                <div className="space-y-4 mb-8">
                  <p className="text-xs uppercase tracking-widest font-black opacity-50">Advisor Reliabilities</p>
                  <div className="grid grid-cols-4 gap-4">
                    {faces.map((f, i) => (
                      <div key={i} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                        <div className="text-2xl mb-1">{f.emoji}</div>
                        <div className="text-sm font-black text-rose-500">{(f.reliability * 100).toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-sm font-bold opacity-80 animate-pulse">Press Space to continue</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === 'COUNTDOWN' && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
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
