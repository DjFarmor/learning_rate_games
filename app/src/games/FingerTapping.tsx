import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LogOut, Info, Keyboard, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';

interface FingerTappingProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const FingerTapping: React.FC<FingerTappingProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'GAME' | 'POST_GAME'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [fingerTappingRepeats, setFingerTappingRepeats] = useState(10);
  const [fingerTappingTimeLimit, setFingerTappingTimeLimit] = useState(20);
  const [fingerTappingSequenceLength, setFingerTappingSequenceLength] = useState(10);
  
  const [fingerTappingSequence, setFingerTappingSequence] = useState<(number | string)[]>([]);
  const [fingerTappingCurrentIndex, setFingerTappingCurrentIndex] = useState(0);
  const [fingerTappingCorrectCount, setFingerTappingCorrectCount] = useState(0);
  const [fingerTappingIncorrectCount, setFingerTappingIncorrectCount] = useState(0);
  const [fingerTappingActive, setFingerTappingActive] = useState(false);
  const [fingerTappingTimeRemaining, setFingerTappingTimeRemaining] = useState(20);
  const [fingerTappingFeedback, setFingerTappingFeedback] = useState<(boolean | null)[]>([]);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);

  const fingerTappingCurrentIndexRef = useRef(0);
  const fingerTappingCorrectCountRef = useRef(0);
  const fingerTappingIncorrectCountRef = useRef(0);
  const isFinishingRef = useRef(false);

  const generateSequence = useCallback(() => {
    const seq: (number | string)[] = [];
    let lastNum: number | null = null;
    for (let i = 0; i < fingerTappingSequenceLength; i++) {
      let nextNum;
      do {
        nextNum = Math.floor(Math.random() * 10);
      } while (nextNum === lastNum);
      seq.push(nextNum);
      lastNum = nextNum;
    }
    seq.push('Space');
    setFingerTappingSequence(seq);
    setFingerTappingFeedback(new Array(seq.length).fill(null));
  }, [fingerTappingSequenceLength]);

  const finishRound = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setFingerTappingActive(false);
    
    const finalScore = fingerTappingCorrectCountRef.current - fingerTappingIncorrectCountRef.current;
    const totalTaps = fingerTappingCorrectCountRef.current + fingerTappingIncorrectCountRef.current;
    const timeSpentPerPress = totalTaps > 0 ? fingerTappingTimeLimit / totalTaps : 0;
    
    setLastRoundScore(finalScore);
    setShowRoundScore(true);
    setSessionScores(prev => [...prev, finalScore]);

    await saveResult('Finger Tapping', {
      attempt: currentGameAttemptId,
      trial,
      score: finalScore,
      correct: fingerTappingCorrectCountRef.current,
      errors: fingerTappingIncorrectCountRef.current,
      time_spent_per_button_press: timeSpentPerPress,
      time: fingerTappingTimeLimit * 1000,
      repetitions: fingerTappingRepeats,
      time_limit: fingerTappingTimeLimit,
      sequence_length: fingerTappingSequenceLength
    });

    setGameState('POST_GAME');
  };

  const handleContinue = useCallback(() => {
    if (gameState !== 'POST_GAME') return;
    
    setShowRoundScore(false);
    isFinishingRef.current = false;
    if (trial < fingerTappingRepeats) {
      setTrial(prev => prev + 1);
      startRound();
    } else {
      onFinish([...sessionScores]);
    }
  }, [gameState, trial, fingerTappingRepeats, onFinish, sessionScores]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'POST_GAME' && e.key === 'Enter') {
        handleContinue();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gameState, handleContinue]);

  const startRound = () => {
    setFingerTappingCurrentIndex(0);
    fingerTappingCurrentIndexRef.current = 0;
    setFingerTappingCorrectCount(0);
    setFingerTappingIncorrectCount(0);
    fingerTappingCorrectCountRef.current = 0;
    fingerTappingIncorrectCountRef.current = 0;
    setFingerTappingActive(false);
    setFingerTappingTimeRemaining(fingerTappingTimeLimit);
    setFingerTappingFeedback(new Array(fingerTappingSequence.length).fill(null));
    setGameState('GAME');
  };

  useEffect(() => {
    if (gameState !== 'GAME') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinishingRef.current) return;

      if (!fingerTappingActive) {
        setFingerTappingActive(true);
      }

      const expected = fingerTappingSequence[fingerTappingCurrentIndexRef.current];
      let isCorrect = false;

      if (expected === 'Space') {
        isCorrect = e.code === 'Space';
      } else {
        isCorrect = e.key === expected.toString();
      }

      if (isCorrect) {
        fingerTappingCorrectCountRef.current += 1;
        setFingerTappingCorrectCount(fingerTappingCorrectCountRef.current);
        
        const newFeedback = [...fingerTappingFeedback];
        newFeedback[fingerTappingCurrentIndexRef.current] = true;
        setFingerTappingFeedback(newFeedback);
      } else {
        fingerTappingIncorrectCountRef.current += 1;
        setFingerTappingIncorrectCount(fingerTappingIncorrectCountRef.current);
        
        const newFeedback = [...fingerTappingFeedback];
        newFeedback[fingerTappingCurrentIndexRef.current] = false;
        setFingerTappingFeedback(newFeedback);
        
        const idx = fingerTappingCurrentIndexRef.current;
        setTimeout(() => {
          setFingerTappingFeedback(prev => {
            const next = [...prev];
            next[idx] = null;
            return next;
          });
        }, 200);
      }

      fingerTappingCurrentIndexRef.current += 1;
      if (fingerTappingCurrentIndexRef.current >= fingerTappingSequence.length) {
        fingerTappingCurrentIndexRef.current = 0;
        setFingerTappingFeedback(new Array(fingerTappingSequence.length).fill(null));
      }
      setFingerTappingCurrentIndex(fingerTappingCurrentIndexRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, fingerTappingActive, fingerTappingSequence, fingerTappingFeedback]);

  useEffect(() => {
    if (gameState === 'GAME' && fingerTappingActive && fingerTappingTimeRemaining > 0) {
      const timer = setInterval(() => {
        setFingerTappingTimeRemaining(prev => {
          if (prev <= 0.1) {
            clearInterval(timer);
            finishRound();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
      return () => clearInterval(timer);
    }
  }, [gameState, fingerTappingActive, fingerTappingTimeRemaining]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="ft-settings"
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
            <h2 className="text-4xl font-black mb-4 tracking-tighter text-white uppercase">FINGER TAPPING SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Repetitions</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 3, 5, 10, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => setFingerTappingRepeats(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      fingerTappingRepeats === n 
                        ? "bg-purple-600 border-purple-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Time Limit (Seconds)</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 60].map(n => (
                  <button
                    key={n}
                    onClick={() => setFingerTappingTimeLimit(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      fingerTappingTimeLimit === n 
                        ? "bg-purple-600 border-purple-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Sequence Length</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setFingerTappingSequenceLength(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      fingerTappingSequenceLength === n 
                        ? "bg-purple-600 border-purple-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setGameState('INSTRUCTIONS');
              generateSequence();
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
        key="ft-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter text-white">FINGER TAPPING</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12">
            <p>Each sequence consists of a series of numbers ending with a <span className="text-purple-500 font-bold uppercase">Spacebar</span> press.</p>
            <p>The goal is to type the sequence (including space) as many times as possible within the time limit. The sequence repeats automatically.</p>
            <p>Your score is <span className="text-white font-bold tracking-tight">Correct taps minus Errors</span>. Errors count negatively.</p>
            <p><span className="text-purple-500 font-bold uppercase">Fast and Accurate</span> is the goal!</p>
          </div>
          <button
            onClick={() => startRound()}
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
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden"
    >
      <Header
        game="Finger Tapping"
        currentTrial={trial}
        totalTrials={fingerTappingRepeats}
        bestScore={bestScore}
        timeDisplay={`${fingerTappingTimeRemaining.toFixed(1)}s`}
        instructions={gameState === 'POST_GAME' ? 'Trial Complete - Press Enter' : (!fingerTappingActive ? 'Press any key to start' : 'Type the sequence!')}
        showInstructions={true}
        onExit={onExit}
      />

      <div className="flex-1 w-full relative bg-black flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="flex flex-nowrap justify-center gap-2 w-full max-w-full overflow-x-auto no-scrollbar px-4 mb-8">
          {fingerTappingSequence.map((char, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: i === fingerTappingCurrentIndex ? 1.1 : 0.9,
                opacity: 1,
                backgroundColor: fingerTappingFeedback[i] === true ? '#10b981' : (fingerTappingFeedback[i] === false ? '#ef4444' : (i === fingerTappingCurrentIndex ? '#18181b' : '#09090b'))
              }}
              className={cn(
                "flex-none w-12 h-16 sm:w-16 sm:h-20 rounded-xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-black transition-all duration-100",
                i === fingerTappingCurrentIndex ? "border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]" : "border-zinc-800 text-zinc-600"
              )}
            >
              {char === 'Space' ? '␣' : char}
            </motion.div>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-2 gap-12">
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Correct</p>
            <p className="text-6xl font-black text-emerald-500">{fingerTappingCorrectCount}</p>
          </div>
          <div className="text-center">
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Incorrect</p>
            <p className="text-6xl font-black text-red-500">{fingerTappingIncorrectCount}</p>
          </div>
        </div>

        <AnimatePresence>
          {showRoundScore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md z-[100] pointer-events-auto"
            >
              <div className="bg-purple-600 text-white p-12 rounded-[3rem] shadow-2xl border-4 border-white/20 text-center">
                <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-70">Round Score</p>
                <p className="text-8xl font-black tracking-tighter mb-8">{lastRoundScore}</p>
                <button
                  onClick={handleContinue}
                  className="bg-white text-purple-600 font-black px-12 py-6 rounded-2xl hover:bg-zinc-100 transition-all text-xl"
                >
                  Press ENTER to Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};
