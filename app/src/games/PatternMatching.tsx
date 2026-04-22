import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LogOut, Info, Check, X, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';

interface PatternMatchingProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const PatternMatching: React.FC<PatternMatchingProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'WAITING' | 'COUNTDOWN' | 'GAME'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [totalTrials, setTotalTrials] = useState(6);
  const [shiftsPerTrial, setShiftsPerTrial] = useState(3);
  const [reliability, setReliability] = useState(100);
  const [guessTimeLimit, setGuessTimeLimit] = useState(3);
  const [streakTargetBase, setStreakTargetBase] = useState(3);
  
  const [currentShiftInTrial, setCurrentShiftInTrial] = useState(1);
  const [currentRule, setCurrentRule] = useState<'Number' | 'Color' | 'Shape'>('Number');
  const [stimulus, setStimulus] = useState<{number: number, color: string, shape: string} | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  const [correctInRow, setCorrectInRow] = useState(0);
  const [targetCorrectInRow, setTargetCorrectInRow] = useState(3);
  const [guessTimeRemaining, setGuessTimeRemaining] = useState(3);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [guessesInCurrentShift, setGuessesInCurrentShift] = useState(0);

  const correctInShiftRef = useRef(0);
  const wrongInShiftRef = useRef(0);
  const totalCorrectInTrialRef = useRef(0);
  const totalWrongInTrialRef = useRef(0);
  const shiftScoresRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);
  const timeoutCountRef = useRef(0);

  const REFERENCE_PATTERNS = [
    { number: 1, color: 'Blue', shape: 'Circle' },
    { number: 2, color: 'Green', shape: 'Square' },
    { number: 3, color: 'White', shape: 'Triangle' },
    { number: 4, color: 'Black', shape: 'Star' }
  ];

  const generateStimulus = useCallback(() => {
    const colors = ['Blue', 'Green', 'White', 'Black'];
    const shapes = ['Circle', 'Square', 'Triangle', 'Star'];

    let num: number, color: string, shape: string;
    let isReference: boolean;

    do {
      num = Math.floor(Math.random() * 4) + 1;
      color = colors[Math.floor(Math.random() * colors.length)];
      shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      isReference = REFERENCE_PATTERNS.some(ref => 
        ref.number === num && ref.color === color && ref.shape === shape
      );
    } while (isReference);

    setStimulus({ number: num, color, shape });
    setFeedback(null);
    setGuessTimeRemaining(guessTimeLimit);
  }, [guessTimeLimit]);

  const getTargetStreak = useCallback(() => {
    const variation = Math.floor(Math.random() * 3) - 1;
    return Math.max(1, streakTargetBase + variation);
  }, [streakTargetBase]);

  const finishTrial = async () => {
    setActive(false);
    const correct = totalCorrectInTrialRef.current;
    const wrong = totalWrongInTrialRef.current;
    const timeouts = timeoutCountRef.current;
    const total = correct + wrong + timeouts;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;
    
    setLastRoundScore(accuracy);
    setShowRoundScore(true);
    
    const updatedScores = [...sessionScores, accuracy];
    setSessionScores(updatedScores);

    await saveResult('Pattern Matching', {
      attempt: currentGameAttemptId,
      trial,
      score: accuracy,
      time: Date.now() - startTimeRef.current,
      total_trials: totalTrials,
      shifts_per_trial: shiftsPerTrial,
      streak_target_base: streakTargetBase,
      guess_time_limit: guessTimeLimit,
      total_correct: correct,
      total_wrong: wrong,
      total_timeouts: timeouts
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

  const handleShift = useCallback(async () => {
    const correct = correctInShiftRef.current;
    const wrong = wrongInShiftRef.current;
    
    totalCorrectInTrialRef.current += correct;
    totalWrongInTrialRef.current += wrong;

    if (currentShiftInTrial >= shiftsPerTrial) {
      await finishTrial();
    } else {
      const rules: ('Number' | 'Color' | 'Shape')[] = ['Number', 'Color', 'Shape'];
      const otherRules = rules.filter(r => r !== currentRule);
      const nextRule = otherRules[Math.floor(Math.random() * otherRules.length)];
      
      setCurrentShiftInTrial(prev => prev + 1);
      setCorrectInRow(0);
      setGuessesInCurrentShift(0);
      correctInShiftRef.current = 0;
      wrongInShiftRef.current = 0;
      setCurrentRule(nextRule);
      setTargetCorrectInRow(getTargetStreak());
      generateStimulus();
    }
  }, [currentShiftInTrial, shiftsPerTrial, currentRule, getTargetStreak, generateStimulus]);

  const handleChoice = (choiceIndex: number) => {
    if (!active || feedback || !stimulus) return;

    const nextGuesses = guessesInCurrentShift + 1;
    setGuessesInCurrentShift(nextGuesses);

    let isCorrect = false;
    if (currentRule === 'Number') {
      isCorrect = stimulus.number === (choiceIndex + 1);
    } else if (currentRule === 'Color') {
      const colors = ['Blue', 'Green', 'White', 'Black'];
      isCorrect = stimulus.color === colors[choiceIndex];
    } else if (currentRule === 'Shape') {
      const shapes = ['Circle', 'Square', 'Triangle', 'Star'];
      isCorrect = stimulus.shape === shapes[choiceIndex];
    }

    if (isCorrect) {
      correctInShiftRef.current += 1;
      const nextCorrectInRow = correctInRow + 1;
      setCorrectInRow(nextCorrectInRow);
      
      const showCorrectFeedback = Math.random() * 100 < reliability;
      setFeedback(showCorrectFeedback ? 'correct' : 'incorrect');

      setTimeout(() => {
        if (nextCorrectInRow >= targetCorrectInRow || nextGuesses >= 20) {
          handleShift();
        } else {
          generateStimulus();
        }
      }, 600);
    } else {
      wrongInShiftRef.current += 1;
      setCorrectInRow(0);
      setFeedback('incorrect');

      setTimeout(() => {
        if (nextGuesses >= 20) {
          handleShift();
        } else {
          generateStimulus();
        }
      }, 600);
    }
  };

  const handleTimeout = useCallback(() => {
    if (!active || feedback || gameState !== 'GAME') return;

    const nextGuesses = guessesInCurrentShift + 1;
    setGuessesInCurrentShift(nextGuesses);
    
    setFeedback('timeout');
    timeoutCountRef.current += 1;
    
    setTimeout(() => {
      if (nextGuesses >= 20) {
        handleShift();
      } else {
        generateStimulus();
      }
    }, 1000);
  }, [active, feedback, gameState, guessesInCurrentShift, generateStimulus, handleShift]);

  const startTrial = useCallback(() => {
    setCurrentShiftInTrial(1);
    setCorrectInRow(0);
    setGuessesInCurrentShift(0);
    correctInShiftRef.current = 0;
    wrongInShiftRef.current = 0;
    totalCorrectInTrialRef.current = 0;
    totalWrongInTrialRef.current = 0;
    timeoutCountRef.current = 0;
    shiftScoresRef.current = [];
    
    const rules: ('Number' | 'Color' | 'Shape')[] = ['Number', 'Color', 'Shape'];
    setCurrentRule(rules[Math.floor(Math.random() * rules.length)]);
    setTargetCorrectInRow(getTargetStreak());
    
    startTimeRef.current = Date.now();
    setActive(true);
    setGameState('GAME');
    generateStimulus();
  }, [getTargetStreak, generateStimulus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'INSTRUCTIONS' && e.code === 'Space') {
        setGameState('WAITING');
        setCountdown(3);
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
      if (gameState === 'GAME' && active && !feedback) {
        if (e.key === '1') handleChoice(0);
        if (e.key === '2') handleChoice(1);
        if (e.key === '3') handleChoice(2);
        if (e.key === '4') handleChoice(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, showRoundScore, handleContinue, active, feedback, stimulus, currentRule, guessesInCurrentShift, correctInRow, targetCorrectInRow, reliability]);

  useEffect(() => {
    if (gameState === 'COUNTDOWN') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startTrial();
      }
    }
  }, [gameState, countdown, startTrial]);

  useEffect(() => {
    if (!active || feedback || gameState !== 'GAME') return;

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
  }, [active, feedback, gameState, handleTimeout]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="pm-settings"
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
            <h2 className="text-4xl font-black mb-4 tracking-tighter text-white uppercase">PATTERN MATCHING SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Trials</label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 4, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      onClick={() => setTotalTrials(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        totalTrials === n ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Shifts Per Trial</label>
                <div className="grid grid-cols-3 gap-2">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setShiftsPerTrial(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        shiftsPerTrial === n ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Feedback Reliability</label>
                <div className="grid grid-cols-4 gap-2">
                  {[100, 90, 80, 70].map(n => (
                    <button
                      key={n}
                      onClick={() => setReliability(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        reliability === n ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      )}
                    >
                      {n}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Correct to Shift (Base)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setStreakTargetBase(n)}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all border",
                        streakTargetBase === n ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Guess Time Limit</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setGuessTimeLimit(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      guessTimeLimit === n ? "bg-indigo-600 border-indigo-500 text-white" : "bg-zinc-950 border-zinc-800 text-zinc-400"
                    )}
                  >
                    {n}s
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
        key="pm-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter text-white">PATTERN MATCHING</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12">
            <p>Determine which feature of the stimulus (<span className="text-white font-bold">Number, Color, or Shape</span>) is the current <span className="text-indigo-500 font-bold uppercase">Hidden Rule</span>.</p>
            <p>Press the key <span className="text-white font-bold">(1-4)</span> for the top card that match the stimulus on that specific feature.</p>
            <p>If your match is correct, you get a point. After several correct answers in a row, the <span className="text-indigo-500 font-bold uppercase tracking-tighter">Rule Changes</span>.</p>
            <p>Use the feedback to deduce the new rule as quickly as possible!</p>
          </div>
          <button
            onClick={() => {
              setGameState('WAITING');
              setCountdown(3);
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
        key="pm-waiting"
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
        game="Pattern Matching"
        currentTrial={trial}
        totalTrials={totalTrials}
        bestScore={bestScore}
        timeDisplay={`${guessTimeRemaining.toFixed(1)}s`}
        onExit={onExit}
      />

      <div className="flex-1 w-full relative bg-black flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl grid grid-cols-4 gap-4 mb-20">
          {REFERENCE_PATTERNS.map((ref, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[2.5rem] flex flex-col items-center gap-6">
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Ref {i + 1}</span>
              <div className="flex gap-2">
                {Array.from({ length: ref.number }).map((_, j) => {
                  const clipPath = ref.shape === 'Circle' ? 'circle(50%)' : (ref.shape === 'Square' ? 'inset(0)' : (ref.shape === 'Triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'));
                  return (
                    <div key={j} className="relative w-8 h-8">
                      {/* Outline */}
                      <div 
                        className="absolute inset-[-2px] bg-white"
                        style={{ clipPath }}
                      />
                      {/* Shape */}
                      <div 
                        className={cn(
                          "absolute inset-0",
                          ref.color === 'Blue' && "bg-blue-500",
                          ref.color === 'Green' && "bg-emerald-500",
                          ref.color === 'White' && "bg-white",
                          ref.color === 'Black' && "bg-zinc-950"
                        )}
                        style={{ clipPath }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="relative mb-20 h-64 flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            {stimulus && !feedback && (
              <motion.div
                key="stimulus"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="bg-zinc-800 p-12 rounded-[3rem] border-4 border-white/10 flex flex-col items-center gap-6 min-w-[300px] min-h-[200px] justify-center"
              >
                <div className="flex gap-2">
                  {Array.from({ length: stimulus.number }).map((_, j) => {
                    const clipPath = stimulus.shape === 'Circle' ? 'circle(50%)' : (stimulus.shape === 'Square' ? 'inset(0)' : (stimulus.shape === 'Triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'));
                    return (
                      <div key={j} className="relative w-12 h-12">
                        {/* Outline */}
                        <div 
                          className="absolute inset-[-3px] bg-white"
                          style={{ clipPath }}
                        />
                        {/* Shape */}
                        <div 
                          className={cn(
                            "absolute inset-0",
                            stimulus.color === 'Blue' && "bg-blue-500",
                            stimulus.color === 'Green' && "bg-emerald-500",
                            stimulus.color === 'White' && "bg-white",
                            stimulus.color === 'Black' && "bg-zinc-950"
                          )}
                          style={{ clipPath }}
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {feedback && (
              <motion.div
                key="feedback"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className={cn(
                  "p-12 rounded-[3rem] border-4 flex flex-col items-center gap-4 min-w-[300px] min-h-[200px] justify-center",
                  feedback === 'correct' ? "bg-emerald-500 border-white/20" : (feedback === 'timeout' ? "bg-zinc-800 border-red-500" : "bg-red-500 border-white/20")
                )}
              >
                {feedback === 'correct' ? <Check className="w-20 h-20 text-white" /> : (feedback === 'timeout' ? <Clock className="w-20 h-20 text-red-500" /> : <X className="w-20 h-20 text-white" />)}
                <span className="text-2xl font-black text-white uppercase tracking-tighter">
                  {feedback === 'correct' ? 'Correct' : (feedback === 'timeout' ? 'Timeout' : 'Incorrect')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute -bottom-4 left-0 right-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(guessTimeRemaining / guessTimeLimit) * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Use keys 1-4 to select</p>
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
