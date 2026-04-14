import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Login } from './components/Login';
import { GameSelection } from './components/GameSelection';
import { ResultsScreen } from './components/ResultsScreen';
import { DotMemory } from './games/DotMemory';
import { PathTracing } from './games/PathTracing';
import { Tracking } from './games/Tracking';
import { FingerTapping } from './games/FingerTapping';
import { PatternMatching } from './games/PatternMatching';
import { Prediction } from './games/Prediction';
import { QuestionnaireSection } from './components/QuestionnaireSection';
import { useGameData } from './hooks/useGameData';
import { GameType } from './types/game';

export default function App() {
  const [gameState, setGameState] = useState<'LOGIN' | 'GAME_SELECT' | 'PLAYING' | 'FINISHED'>('LOGIN');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [bestScore, setBestScore] = useState(0);

  const {
    currentGameAttemptId,
    getAndSetNextAttempt,
    aggregateStats,
    fetchStats,
    saveResult
  } = useGameData(nickname);

  const handleLogin = async () => {
    if (!nickname || !password) {
      setAuthError('Nickname and password are required');
      return;
    }
    if (nickname.length < 6) {
      setAuthError('Nickname must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setGameState('GAME_SELECT');
        setAuthError('');
      } else {
        setAuthError(data.error || 'Login failed');
      }
    } catch (e) {
      console.error('Login error:', e);
      setAuthError('Connection error');
    }
  };

  const handleSelectGame = async (game: GameType) => {
    setCurrentGame(game);
    setSessionScores([]);
    setBestScore(0);
    await getAndSetNextAttempt(game);
    setGameState('PLAYING');
  };

  const handleFinishGame = (scores: number[]) => {
    setSessionScores(scores);
    setBestScore(Math.max(...scores));
    if (currentGame) {
      fetchStats(currentGame);
    }
    setGameState('FINISHED');
  };

  const handleBackToMenu = () => {
    setGameState('GAME_SELECT');
    setCurrentGame(null);
  };

  const handlePlayAgain = async () => {
    if (currentGame) {
      setSessionScores([]);
      setBestScore(0);
      await getAndSetNextAttempt(currentGame);
      setGameState('PLAYING');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {gameState === 'LOGIN' && (
          <Login 
            key="login" 
            nickname={nickname}
            setNickname={setNickname}
            password={password}
            setPassword={setPassword}
            authError={authError}
            onLogin={handleLogin} 
          />
        )}

        {gameState === 'GAME_SELECT' && (
          <GameSelection 
            key="selection" 
            nickname={nickname}
            onSelectGame={handleSelectGame}
            onLogout={() => {
              setNickname('');
              setGameState('LOGIN');
            }}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Dot Memory' && (
          <DotMemory
            key="dot-memory"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Path Tracing' && (
          <PathTracing
            key="path-tracing"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Tracking' && (
          <Tracking
            key="tracking"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Finger Tapping' && (
          <FingerTapping
            key="finger-tapping"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Pattern Matching' && (
          <PatternMatching
            key="pattern-matching"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Prediction' && (
          <Prediction
            key="prediction"
            nickname={nickname}
            currentGameAttemptId={currentGameAttemptId}
            bestScore={bestScore}
            onFinish={handleFinishGame}
            onExit={handleBackToMenu}
            saveResult={saveResult}
          />
        )}

        {gameState === 'PLAYING' && currentGame === 'Questionnaires' && (
          <QuestionnaireSection
            key="questionnaires"
            nickname={nickname}
            onExit={handleBackToMenu}
          />
        )}

        {gameState === 'FINISHED' && (
          <ResultsScreen
            key="results"
            bestScore={bestScore}
            sessionScores={sessionScores}
            aggregateStats={aggregateStats}
            lastGamePlayed={currentGame}
            currentGameAttemptId={currentGameAttemptId}
            onPlayAgain={handlePlayAgain}
            onBackToMenu={handleBackToMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
