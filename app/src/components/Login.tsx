import React from 'react';
import { motion } from 'motion/react';
import { User, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  nickname: string;
  setNickname: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  authError: string;
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({
  nickname,
  setNickname,
  password,
  setPassword,
  authError,
  onLogin
}) => {
  return (
    <motion.div
      key="login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto pt-32 px-6"
    >
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black tracking-tighter mb-4">LOG IN</h1>
        <p className="text-zinc-400">
          Enter your nickname and password to begin. 
          <br />
          <span className="text-xs mt-2 block opacity-70">
            You can use any nickname and password, but you must remember both to play again and track your progress.
          </span>
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Nickname (min 6 chars)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        {authError && <p className="text-red-400 text-sm px-2">{authError}</p>}
        <button
          onClick={onLogin}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 group"
        >
          Enter
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
