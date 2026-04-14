import React from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowRight, RefreshCw } from 'lucide-react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  Label 
} from 'recharts';

interface ResultsScreenProps {
  bestScore: number;
  sessionScores: number[];
  aggregateStats: any;
  lastGamePlayed: string | null;
  currentGameAttemptId: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  bestScore,
  sessionScores,
  aggregateStats,
  lastGamePlayed,
  currentGameAttemptId,
  onPlayAgain,
  onBackToMenu
}) => {
  const chartData = Array.from({ length: Math.max(10, sessionScores.length) }, (_, i) => i + 1).map(t => {
    const global = aggregateStats?.globalStats?.find((st: any) => st.trial === t);
    const currentScore = sessionScores[t - 1];
    
    const dataPoint: any = {
      trial: t,
      current: currentScore,
      avg: global?.avgScore,
      error: global ? [global.avgScore - global.stdErr, global.avgScore + global.stdErr] : null
    };

    // Calculate user's historical mean for this trial
    const previousScores = aggregateStats?.userAttempts
      ?.filter((att: any) => att.attempt !== currentGameAttemptId)
      ?.map((att: any) => att.scores[t - 1])
      ?.filter((s: any) => s !== undefined && s !== null);
    
    if (previousScores && previousScores.length > 0) {
      dataPoint.userMean = previousScores.reduce((a: number, b: number) => a + b, 0) / previousScores.length;
    }

    // Add individual previous attempts
    aggregateStats?.userAttempts?.forEach((att: any) => {
      if (att.attempt !== currentGameAttemptId) {
        dataPoint[`attempt_${att.attempt}`] = att.scores[t - 1];
      }
    });

    return dataPoint;
  });

  const isFingerTapping = lastGamePlayed === 'Finger Tapping';

  return (
    <motion.div
      key="finished"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-zinc-950 flex items-center justify-center text-center p-8 overflow-y-auto"
    >
      <div className="max-w-4xl w-full py-12">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="space-y-12"
        >
          <div>
            <Trophy className="w-24 h-24 text-amber-500 mx-auto mb-6" />
            <h1 className="text-6xl font-black text-white mb-2 tracking-tighter">CONGRATULATIONS!</h1>
            <p className="text-zinc-400 text-2xl">Session Complete</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Best Score</p>
              <p className="text-5xl font-black text-emerald-500">{bestScore.toFixed(1)}{isFingerTapping ? '' : '%'}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Average Score</p>
              <p className="text-5xl font-black text-blue-500">
                {sessionScores.length > 0
                  ? (sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length).toFixed(1)
                  : (0).toFixed(1)}
                {isFingerTapping ? '' : '%'}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
              <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-2">Repetitions</p>
              <p className="text-5xl font-black text-white">{sessionScores.length}</p>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] h-[500px]">
            <h3 className="text-left text-zinc-500 text-xs uppercase tracking-widest font-bold mb-8">Performance Analysis</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="trial" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[1, Math.max(10, sessionScores.length)]}
                  type="number"
                >
                  <Label value="Trial" offset={-15} position="insideBottom" fill="#71717a" fontSize={10} />
                </XAxis>
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={isFingerTapping ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(v) => isFingerTapping ? v : `${v}%`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                  labelFormatter={(t) => `Trial ${t}`}
                />
                
                <Area
                  type="monotone"
                  dataKey="error"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  name="Global Avg ± Std Error"
                />
                
                <Line
                  type="monotone"
                  dataKey="userMean"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Your Historical Mean"
                />

                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Global Average"
                />

                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  name="Current Session"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={onPlayAgain}
              className="flex-1 bg-white text-black font-black py-6 rounded-3xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 text-xl group"
            >
              <RefreshCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
              Play Again
            </button>
            <button
              onClick={onBackToMenu}
              className="flex-1 bg-zinc-900 text-white font-black py-6 rounded-3xl border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 text-xl group"
            >
              Back to Menu
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
