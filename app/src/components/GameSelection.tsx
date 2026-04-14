import React from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  ArrowRight, 
  RefreshCw, 
  MousePointer2, 
  Keyboard, 
  Brain, 
  ListTodo, 
  Lock 
} from 'lucide-react';

interface GameSelectionProps {
  onLogout: () => void;
  onSelectGame: (game: string) => void;
}

export const GameSelection: React.FC<GameSelectionProps> = ({
  onLogout,
  onSelectGame
}) => {
  const games = [
    {
      id: 'Dot Memory',
      title: 'DOT MEMORY',
      description: 'Test your spatial recall by remembering dot positions.',
      icon: Play,
      color: 'emerald',
      action: () => onSelectGame('Dot Memory')
    },
    {
      id: 'Path Tracing',
      title: 'PATH TRACING',
      description: 'Trace complex paths while fighting a constant drift.',
      icon: RefreshCw,
      color: 'blue',
      action: () => onSelectGame('Path Tracing')
    },
    {
      id: 'Tracking',
      title: 'TRACKING',
      description: 'Follow a moving ball with your cursor as accurately as possible.',
      icon: MousePointer2,
      color: 'amber',
      action: () => onSelectGame('Tracking')
    },
    {
      id: 'Finger Tapping',
      title: 'FINGER TAPPING',
      description: 'Tap the indicated keys as fast and accurately as you can.',
      icon: Keyboard,
      color: 'indigo',
      action: () => onSelectGame('Finger Tapping')
    },
    {
      id: 'Prediction',
      title: 'PREDICTION',
      description: 'Learn to predict outcomes based on advisor reliability.',
      icon: Brain,
      color: 'rose',
      action: () => onSelectGame('Prediction')
    },
    {
      id: 'Pattern Matching',
      title: 'PATTERN MATCHING',
      description: 'Identify the hidden rule and adapt to shifting patterns.',
      icon: ListTodo,
      color: 'cyan',
      action: () => onSelectGame('Pattern Matching')
    },
    {
      id: 'Questionnaires',
      title: 'QUESTIONNAIRES',
      description: 'Help our research by completing anonymous surveys.',
      icon: Brain,
      color: 'purple',
      action: () => onSelectGame('Questionnaires')
    }
  ];

  return (
    <motion.div
      key="game-select"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="max-w-4xl mx-auto pt-20 px-6 pb-20 text-center"
    >
      <div className="flex justify-end mb-8">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          <Lock className="w-3 h-3" />
          Log Out / Switch Account
        </button>
      </div>

      <h1 className="text-6xl font-black tracking-tighter mb-16 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
        SELECT GAME
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={game.action}
            className={`group relative bg-zinc-900/50 border border-zinc-800 p-12 rounded-3xl hover:border-${game.color}-500/50 transition-all text-left overflow-hidden`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <game.icon className="w-32 h-32" />
            </div>
            <h2 className="text-3xl font-black mb-4">{game.title}</h2>
            <p className="text-zinc-400 mb-8">{game.description}</p>
            <div className={`flex items-center gap-2 text-${game.color}-500 font-bold`}>
              Play Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
