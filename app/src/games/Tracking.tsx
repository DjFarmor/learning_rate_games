import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LogOut, Info, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';
import { Dot } from '../types/game';

interface TrackingProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const Tracking: React.FC<TrackingProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'GAME'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [trackingRepeats, setTrackingRepeats] = useState(10);
  const [avgDriftSpeed, setAvgDriftSpeed] = useState(6); // cm/s
  const [driftVariance, setDriftVariance] = useState(30); // %
  const [circleSize, setCircleSize] = useState(2); // cm
  const [trialTime, setTrialTime] = useState(8); // seconds
  
  const CM_TO_PERCENT = 3.33; // Assuming 30cm screen width
  
  const [ballPos, setBallPos] = useState<Dot>({ x: 50, y: 50 });
  const [circlePos, setCirclePos] = useState<Dot>({ x: 50, y: 50 });
  const [trackingActive, setTrackingActive] = useState(false);
  const [isBallInside, setIsBallInside] = useState(false);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(8);
  const [bgImage, setBgImage] = useState('');
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(7));

  const lastMousePos = useRef<Dot>({ x: 50, y: 50 });
  const ballPosRef = useRef<Dot>({ x: 50, y: 50 });
  const circlePosRef = useRef<Dot>({ x: 50, y: 50 });
  const driftVelocityRef = useRef<Dot>({ x: 0, y: 0 });
  const driftSequenceRef = useRef<{angle: number, variance: number, startTime: number, duration: number}[]>([]);
  const lastDriftChangeRef = useRef<number>(0);
  const timeInsideTrackingRef = useRef<number>(0);
  const sessionScoresRef = useRef<number[]>([]);
  const isFinishingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const finishRound = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setTrackingActive(false);
    document.exitPointerLock();

    const roundScore = Math.min(100, (timeInsideTrackingRef.current / trialTime) * 100);
    
    setLastRoundScore(roundScore);
    setShowRoundScore(true);
    sessionScoresRef.current.push(roundScore);
    setSessionScores([...sessionScoresRef.current]);

    await saveResult('Tracking', {
      attempt: currentGameAttemptId,
      trial,
      score: roundScore,
      time: trialTime * 1000,
      repetitions: trackingRepeats,
      avg_drift_speed: avgDriftSpeed,
      drift_variance: driftVariance,
      circle_size: circleSize,
      trial_time: trialTime
    });
  };

  const startRound = () => {
    isFinishingRef.current = false;
    setBallPos({ x: 50, y: 50 });
    ballPosRef.current = { x: 50, y: 50 };
    setCirclePos({ x: 50, y: 50 });
    circlePosRef.current = { x: 50, y: 50 };
    lastMousePos.current = { x: 50, y: 50 };
    setTrackingActive(false);
    setIsBallInside(false);
    timeInsideTrackingRef.current = 0;
    lastDriftChangeRef.current = 0;
    setTimeLeft(trialTime);
    setGameState('GAME');
  };

  const handleContinue = useCallback(() => {
    if (!showRoundScore) return;
    
    setShowRoundScore(false);
    if (trial < trackingRepeats) {
      setTrial(prev => prev + 1);
      startRound();
    } else {
      onFinish(sessionScoresRef.current);
    }
  }, [showRoundScore, trial, trackingRepeats, onFinish]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isFinishingRef.current && !showRoundScore) return;

    if (showRoundScore) {
      handleContinue();
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (!trackingActive) {
      const distToCircle = Math.sqrt(Math.pow(x - circlePos.x, 2) + Math.pow(y - circlePos.y, 2));
      if (distToCircle < 10) {
        setTrackingActive(true);
        startTimeRef.current = 0;
        containerRef.current?.requestPointerLock();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'GAME' || isFinishingRef.current) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (document.pointerLockElement === containerRef.current) {
      const dx = (e.movementX / rect.width) * 100;
      const dy = (e.movementY / rect.height) * 100;
      
      circlePosRef.current = {
        x: Math.max(0, Math.min(100, circlePosRef.current.x + dx)),
        y: Math.max(0, Math.min(100, circlePosRef.current.y + dy))
      };
      setCirclePos({ ...circlePosRef.current });
    } else {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      circlePosRef.current = { x, y };
      setCirclePos({ x, y });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showRoundScore) {
        handleContinue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRoundScore, handleContinue]);

  useEffect(() => {
    if (gameState !== 'GAME' || !trackingActive) return;

    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const elapsed = (now - startTimeRef.current) / 1000;
      
      // Update drift direction using deterministic sequence with variable durations
      const step = driftSequenceRef.current.find(s => elapsed >= s.startTime && elapsed < s.startTime + s.duration);
      
      if (step) {
        const varianceFactor = 1 + step.variance * (driftVariance / 100);
        const speed = avgDriftSpeed * varianceFactor * CM_TO_PERCENT;
        driftVelocityRef.current = {
          x: Math.cos(step.angle) * speed,
          y: Math.sin(step.angle) * speed
        };
      }

      // Update ball position (drift)
      const newBallX = Math.max(5, Math.min(95, ballPosRef.current.x + driftVelocityRef.current.x * dt));
      const newBallY = Math.max(5, Math.min(95, ballPosRef.current.y + driftVelocityRef.current.y * dt));
      ballPosRef.current = { x: newBallX, y: newBallY };
      setBallPos({ ...ballPosRef.current });

      // Check if ball is inside circle
      const dist = Math.sqrt(Math.pow(circlePosRef.current.x - newBallX, 2) + Math.pow(circlePosRef.current.y - newBallY, 2));
      const radius = (circleSize * CM_TO_PERCENT) / 2;
      const inside = dist < radius;
      setIsBallInside(inside);
      if (inside) {
        timeInsideTrackingRef.current += dt;
      }

      const remaining = Math.max(0, trialTime - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        finishRound();
        return;
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [gameState, trackingActive, avgDriftSpeed, driftVariance, circleSize, trialTime]);

  useEffect(() => {
    if (gameState === 'SETTINGS') {
      setBgImage(`https://picsum.photos/seed/tr_${sessionSeed}/1920/1080`);
    }
  }, [gameState, sessionSeed]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="tr-settings"
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
            <h2 className="text-4xl font-black mb-4 tracking-tighter">TRACKING SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Repetitions</label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setTrackingRepeats(n)}
                    className={cn(
                       "py-3 rounded-xl font-bold transition-all border",
                       trackingRepeats === n 
                        ? "bg-amber-600 border-amber-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Avg Drift Speed (cm/s)</label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 4, 6, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setAvgDriftSpeed(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      avgDriftSpeed === n 
                        ? "bg-amber-600 border-amber-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Drift Variance (%)</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 30, 50, 80].map(n => (
                  <button
                    key={n}
                    onClick={() => setDriftVariance(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      driftVariance === n 
                        ? "bg-amber-600 border-amber-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    ±{n}%
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Circle Size (cm)</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => setCircleSize(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      circleSize === n 
                        ? "bg-amber-600 border-amber-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Trial Time (s)</label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 5, 8, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setTrialTime(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      trialTime === n 
                        ? "bg-amber-600 border-amber-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setGameState('INSTRUCTIONS');
              // Generate deterministic drift sequence for the session
              const sequence = [];
              let cumulativeTime = 0;
              for (let i = 0; i < 200; i++) {
                const duration = 0.5 + Math.random() * 1.0; // 0.5 to 1.5 seconds
                sequence.push({
                  angle: Math.random() * Math.PI * 2,
                  variance: Math.random() * 2 - 1,
                  startTime: cumulativeTime,
                  duration: duration
                });
                cumulativeTime += duration;
              }
              driftSequenceRef.current = sequence;
              sessionScoresRef.current = [];
              setSessionScores([]);
              setTrial(1);
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
        key="tr-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter">TRACKING</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12">
            <p>Click the <span className="text-white font-bold uppercase underline decoration-amber-500 underline-offset-4">Circle</span> to start the trial.</p>
            <p>Keep the moving ball <span className="text-white font-bold italic tracking-tight">inside the circle</span> at all times by moving the circle with your cursor.</p>
            <p>The ball moves in random directions, but this <span className="text-amber-500 font-bold uppercase">pattern remains identical</span> across trials.</p>
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
        game="Tracking"
        currentTrial={trial}
        totalTrials={trackingRepeats}
        bestScore={bestScore}
        timeDisplay={trackingActive ? `${timeLeft.toFixed(1)}s` : 'Ready'}
        instructions={showRoundScore ? (trial < trackingRepeats ? 'Press any key or click to continue' : 'Press any key or click to finish') : (!trackingActive ? 'Click the circle to start' : (isBallInside ? 'TRACKING...' : 'OUT OF RANGE!'))}
        showInstructions={true}
        onExit={onExit}
      />

      <div 
        className={cn(
          "flex-1 w-full relative bg-black flex items-center justify-center overflow-hidden",
          trackingActive && "cursor-none"
        )}
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
      >
        <div 
          className="absolute inset-0 opacity-20 grayscale pointer-events-none"
          style={{ 
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        <motion.div
          className={cn(
            "absolute rounded-full border-4 -translate-x-1/2 -translate-y-1/2 z-10 aspect-square box-border",
            isBallInside ? "border-amber-500 bg-amber-500/20" : "border-red-500 bg-red-500/20"
          )}
          style={{ 
            left: `${circlePos.x}%`, 
            top: `${circlePos.y}%`,
            width: `${circleSize * CM_TO_PERCENT}%`
          }}
        />

        <div 
          className="absolute w-4 h-4 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_20px_rgba(255,255,255,0.8)]"
          style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
        />

        <AnimatePresence>
          {showRoundScore && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
            >
              <div className="bg-amber-600 text-white px-12 py-6 rounded-[2rem] shadow-2xl border-4 border-white/20 backdrop-blur-xl text-center">
                <p className="text-xs uppercase tracking-widest font-black mb-1 opacity-70">Round Score</p>
                <p className="text-7xl font-black tracking-tighter mb-4">{lastRoundScore.toFixed(1)}%</p>
                <p className="text-sm font-bold opacity-80 animate-pulse">Press any key or click to continue</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
