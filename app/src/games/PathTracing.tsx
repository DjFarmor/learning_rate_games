import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, LogOut, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';
import { Dot } from '../types/game';

interface PathTracingProps {
  nickname: string;
  currentGameAttemptId: number;
  bestScore: number;
  onFinish: (sessionScores: number[]) => void;
  onExit: () => void;
  saveResult: (game: string, data: any) => Promise<void>;
}

export const PathTracing: React.FC<PathTracingProps> = ({
  nickname,
  currentGameAttemptId,
  bestScore,
  onFinish,
  onExit,
  saveResult
}) => {
  const [gameState, setGameState] = useState<'SETTINGS' | 'INSTRUCTIONS' | 'GAME'>('SETTINGS');
  const [trial, setTrial] = useState(1);
  const [pathTracingRepeats, setPathTracingRepeats] = useState(10);
  const [driftForce, setDriftForce] = useState(2); // cm/s
  const [circleSize, setCircleSize] = useState(1); // cm
  const [timeLimit, setTimeLimit] = useState(5); // Trial time limit in seconds
  
  const CM_TO_PERCENT = 3.33; // Assuming 30cm screen width
  
  const [pathPoints, setPathPoints] = useState<Dot[]>([]);
  const [highResPath, setHighResPath] = useState<Dot[]>([]);
  const [circlePos, setCirclePos] = useState<Dot>({ x: 0, y: 0 });
  const [traceHistory, setTraceHistory] = useState<Dot[]>([]);
  const [fullTraceHistory, setFullTraceHistory] = useState<Dot[]>([]);
  const [traceProgress, setTraceProgress] = useState(0);
  const [tracingActive, setTracingActive] = useState(false);
  const [isOutOfPath, setIsOutOfPath] = useState(false);
  const [timeBlue, setTimeBlue] = useState(0);
  const [timeRed, setTimeRed] = useState(0);
  const [bgImage, setBgImage] = useState('');
  const [sessionSeed] = useState(() => Math.random().toString(36).substring(7));
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [showRoundScore, setShowRoundScore] = useState(false);
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [showPathTracingInstructions, setShowPathTracingInstructions] = useState(true);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [paintedPathD, setPaintedPathD] = useState('');

  const lastMousePos = useRef<Dot>({ x: 0, y: 0 });
  const driftOffsetRef = useRef<Dot>({ x: 0, y: 0 });
  const driftSequenceRef = useRef<{x: number, y: number, duration: number}[]>([]);
  const sessionScoresRef = useRef<number[]>([]);
  const visitedPointsRef = useRef<Set<number>>(new Set());
  const timeBlueRef = useRef<number>(0);
  const timeRedRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isFinishingRef = useRef(false);
  const circlePosRef = useRef<Dot>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const driftIndexRef = useRef(0);
  const driftTimeRef = useRef(0);

  const generatePath = useCallback(() => {
    const controlPoints: Dot[] = [];
    const segments = 5;
    let currentX = 10;
    let currentY = 50;
    controlPoints.push({ x: currentX, y: currentY });

    for (let i = 0; i < segments; i++) {
      currentX += 80 / segments;
      currentY += (Math.random() - 0.5) * 60;
      currentY = Math.max(10, Math.min(90, currentY));
      controlPoints.push({ x: currentX, y: currentY });
    }

    const curve: Dot[] = [];
    const stepsPerSegment = 50;
    
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const p0 = controlPoints[Math.max(0, i - 1)];
      const p1 = controlPoints[i];
      const p2 = controlPoints[i + 1];
      const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];

      for (let t = 0; t < 1; t += 1 / stepsPerSegment) {
        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * t +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * t * t
        );
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * t +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * t * t
        );
        curve.push({ x, y });
      }
    }
    curve.push(controlPoints[controlPoints.length - 1]);

    // Also generate drift sequence here to ensure it's ready
    const sequence = [];
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const duration = 0.7 + Math.random() * 0.6;
      sequence.push({ x: Math.cos(angle), y: Math.sin(angle), duration });
    }
    driftSequenceRef.current = sequence;

    return curve;
  }, []);

  const finishRound = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setTracingActive(false);

    const totalTimeElapsed = (Date.now() - startTime) / 1000;
    const progress = visitedPointsRef.current.size / highResPath.length;
    
    // Score = (time spent blue / trial length) * %path painted
    const roundScore = Math.min(100, (timeBlueRef.current / timeLimit) * progress * 100);

    setLastRoundScore(roundScore);
    setShowRoundScore(true);
    sessionScoresRef.current.push(roundScore);
    setSessionScores([...sessionScoresRef.current]);
    document.exitPointerLock();

    await saveResult('Path Tracing', {
      attempt: currentGameAttemptId,
      trial,
      score: roundScore,
      time: totalTimeElapsed,
      repetitions: pathTracingRepeats,
      drift_force: driftForce,
      circle_size: circleSize,
      time_limit: timeLimit,
      time_blue: timeBlueRef.current,
      time_red: timeRedRef.current,
      progress: progress
    });
  };

  const startRound = (currentPath?: Dot[]) => {
    const activePath = currentPath || pathPoints;
    if (!activePath || activePath.length === 0) return;

    isFinishingRef.current = false;
    setCirclePos(activePath[0]);
    circlePosRef.current = activePath[0];
    driftOffsetRef.current = { x: 0, y: 0 };
    lastMousePos.current = activePath[0];
    setTraceHistory([]);
    setFullTraceHistory([]);
    setTraceProgress(0);
    setTracingActive(false);
    setIsOutOfPath(false);
    setTimeBlue(0);
    setTimeRed(0);
    visitedPointsRef.current = new Set();
    timeBlueRef.current = 0;
    timeRedRef.current = 0;
    driftIndexRef.current = 0;
    driftTimeRef.current = 0;
    setTimeLeft(timeLimit);
    setPaintedPathD('');
    setGameState('GAME');
  };

  const handleContinue = useCallback(() => {
    if (!showRoundScore) return;
    
    setShowRoundScore(false);
    if (trial < pathTracingRepeats) {
      setTrial(prev => prev + 1);
      startRound();
    } else {
      onFinish(sessionScoresRef.current);
    }
  }, [showRoundScore, trial, pathTracingRepeats, onFinish]);

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

    if (!tracingActive && pathPoints.length > 0) {
      const distToStart = Math.sqrt(Math.pow(x - pathPoints[0].x, 2) + Math.pow(y - pathPoints[0].y, 2));
      
      if (distToStart < 10) {
        setTracingActive(true);
        setStartTime(Date.now());
        containerRef.current?.requestPointerLock();
      }
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'GAME' || isFinishingRef.current) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (document.pointerLockElement === containerRef.current) {
      // Use relative movement when locked
      const dx = (e.movementX / rect.width) * 100;
      const dy = (e.movementY / rect.height) * 100;
      
      lastMousePos.current = {
        x: Math.max(0, Math.min(100, lastMousePos.current.x + dx)),
        y: Math.max(0, Math.min(100, lastMousePos.current.y + dy))
      };
    } else {
      // Use absolute position when not locked
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      lastMousePos.current = { x, y };
    }
  };

  useEffect(() => {
    if (gameState !== 'GAME' || !tracingActive) {
      startTimeRef.current = 0;
      return;
    }

    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update drift
      driftTimeRef.current += dt;
      const sequence = driftSequenceRef.current;
      if (sequence.length === 0) return;

      const currentDriftStep = sequence[driftIndexRef.current % sequence.length];
      if (driftTimeRef.current >= currentDriftStep.duration) {
        driftIndexRef.current++;
        driftTimeRef.current = 0;
      }

      const driftPx = driftForce * CM_TO_PERCENT;
      const driftDir = sequence[driftIndexRef.current % sequence.length];
      
      driftOffsetRef.current = {
        x: driftOffsetRef.current.x + driftDir.x * driftPx * dt,
        y: driftOffsetRef.current.y + driftDir.y * driftPx * dt
      };

      // Calculate new position
      const targetX = lastMousePos.current.x + driftOffsetRef.current.x;
      const targetY = lastMousePos.current.y + driftOffsetRef.current.y;
      
      const newX = circlePosRef.current.x + (targetX - circlePosRef.current.x) * 0.2;
      const newY = circlePosRef.current.y + (targetY - circlePosRef.current.y) * 0.2;
      circlePosRef.current = { x: newX, y: newY };

      // Check if the path is within the circle
      const radius = (circleSize * CM_TO_PERCENT) / 2; 

      const minDist = Math.min(...highResPath.map((p, i) => {
        const d = Math.sqrt(Math.pow(p.x - newX, 2) + Math.pow(p.y - newY, 2));
        if (d < radius) {
          visitedPointsRef.current.add(i);
        }
        return d;
      }));

      const out = minDist > radius;
      setIsOutOfPath(out);
      if (out) {
        timeRedRef.current += dt;
        setTimeRed(timeRedRef.current);
      } else {
        timeBlueRef.current += dt;
        setTimeBlue(timeBlueRef.current);
      }

      setCirclePos({ x: newX, y: newY });
      setTraceHistory(h => [...h.slice(-50), { x: newX, y: newY }]);
      setFullTraceHistory(h => [...h, { x: newX, y: newY }]);
      
      const progress = visitedPointsRef.current.size / highResPath.length;
      setTraceProgress(progress);

      // Generate non-sequential painted path string
      let d = '';
      let inSegment = false;
      for (let i = 0; i < highResPath.length; i++) {
        if (visitedPointsRef.current.has(i)) {
          if (!inSegment) {
            d += `M ${highResPath[i].x} ${highResPath[i].y} `;
            inSegment = true;
          } else {
            d += `L ${highResPath[i].x} ${highResPath[i].y} `;
          }
        } else {
          inSegment = false;
        }
      }
      setPaintedPathD(d);

      // Update timer
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(remaining);

      if (progress > 0.99 || remaining <= 0 || newX > 95) {
        finishRound();
      }

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [gameState, tracingActive, driftForce, trial, circleSize, highResPath]);

  useEffect(() => {
    if (gameState === 'SETTINGS') {
      setBgImage(`https://picsum.photos/seed/pt_${sessionSeed}/1920/1080`);
    }
  }, [gameState, sessionSeed]);

  if (gameState === 'SETTINGS') {
    return (
      <motion.div
        key="pt-settings"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-2xl mx-auto pt-20 px-6 pb-20"
      >
        <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-[3rem] space-y-12">
          <div className="text-center">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">PATH TRACING SETTINGS</h2>
            <p className="text-zinc-400">Configure the difficulty of the task.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Repetitions</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 5, 10, 15, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setPathTracingRepeats(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      pathTracingRepeats === n 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Drift Force (cm/s)</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 4, 6, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => setDriftForce(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      driftForce === n 
                        ? "bg-blue-600 border-blue-500 text-white" 
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Circle Size (cm)</label>
              <div className="grid grid-cols-5 gap-2">
                {[0.5, 1.0, 1.5, 2.0, 2.5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCircleSize(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      circleSize === n 
                        ? "bg-blue-600 border-blue-500 text-white" 
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
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setTimeLimit(n)}
                    className={cn(
                      "py-3 rounded-xl font-bold transition-all border",
                      timeLimit === n 
                        ? "bg-blue-600 border-blue-500 text-white" 
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
              const newPath = generatePath();
              setPathPoints(newPath);
              setHighResPath(newPath);
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
        key="pt-instructions"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-6"
      >
        <div className="max-w-2xl text-center">
          <h2 className="text-6xl font-black mb-8 tracking-tighter">PATH TRACING</h2>
          <div className="space-y-6 text-xl text-zinc-400 mb-12 text-left">
            <p>Trace the path from left to right as accurately as possible.</p>
            <p>The path is <span className="text-white font-bold uppercase">Visible</span> during the game.</p>
            <p>A constant <span className="text-blue-500 font-bold uppercase">Drift</span> will try to pull your cursor away.</p>
            <p>The circle turns <span className="text-blue-500 font-bold uppercase">Blue</span> when on path and <span className="text-red-500 font-bold uppercase">Red</span> when off.</p>
            <p>Click the <span className="text-white font-bold uppercase">Start Circle</span> on the left to begin.</p>
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
        game="Path Tracing"
        currentTrial={trial}
        totalTrials={pathTracingRepeats}
        bestScore={bestScore}
        timeDisplay={tracingActive ? `${timeLeft.toFixed(1)}s` : 'Ready'}
        instructions={showRoundScore ? (trial < pathTracingRepeats ? 'Press any key or click to continue' : 'Press any key or click to finish') : (!tracingActive ? 'Click the start circle' : (isOutOfPath ? 'OUT OF PATH!' : 'STAY IN THE PATH'))}
        showInstructions={showPathTracingInstructions}
        onExit={onExit}
      />

      <div 
        className={cn(
          "flex-1 w-full relative bg-black flex items-center justify-center overflow-hidden",
          tracingActive && "cursor-none"
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

        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Base Path (Thin Line) */}
          <path
            d={`M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            fill="none"
            stroke="#333"
            strokeWidth="0.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Painted Path (Progress) */}
          <path
            d={paintedPathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-100"
          />

          {/* Shaded area for user's path history in feedback */}
          {showRoundScore && (
            <path
              d={`M ${fullTraceHistory.map(p => `${p.x} ${p.y}`).join(' L ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="0.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.2"
            />
          )}
        </svg>

        <motion.div
          className={cn(
            "absolute rounded-full border-2 -translate-x-1/2 -translate-y-1/2 z-10 aspect-square",
            tracingActive ? (isOutOfPath ? "border-red-500 bg-red-500/20" : "border-blue-500 bg-blue-500/20") : "border-white bg-white/20 animate-pulse"
          )}
          style={{ 
            left: `${circlePos.x}%`, 
            top: `${circlePos.y}%`,
            width: `${circleSize * CM_TO_PERCENT}%`
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full" />
          </div>
        </motion.div>

        {!tracingActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute w-12 h-12 border-4 border-emerald-500 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
            style={{ left: `${pathPoints[0]?.x}%`, top: `${pathPoints[0]?.y}%` }}
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          </motion.div>
        )}

        <AnimatePresence>
          {showRoundScore && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]"
            >
              <div className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] shadow-2xl border-4 border-white/20 backdrop-blur-xl text-center">
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
