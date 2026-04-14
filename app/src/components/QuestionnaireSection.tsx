import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Questionnaire } from '../types/game';

interface QuestionnaireSectionProps {
  nickname: string;
  onExit: () => void;
}

export const QuestionnaireSection: React.FC<QuestionnaireSectionProps> = ({
  nickname,
  onExit
}) => {
  const [view, setView] = useState<'LIST' | 'VIEW' | 'SUCCESS'>('LIST');
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [currentQuestionnaire, setCurrentQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const fetchQuestionnaires = async () => {
    try {
      const res = await fetch(`/api/questionnaires?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      setQuestionnaires(data);
    } catch (e) {
      console.error('Failed to fetch questionnaires');
    }
  };

  const selectQuestionnaire = async (id: string) => {
    try {
      const res = await fetch(`/api/questionnaire/${id}`);
      const data = await res.json();
      setCurrentQuestionnaire(data);
      setAnswers({});
      setView('VIEW');
    } catch (e) {
      console.error('Failed to fetch questionnaire');
    }
  };

  const submitQuestionnaire = async () => {
    if (!currentQuestionnaire) return;
    
    const unanswered = currentQuestionnaire.questions.some((_, i) => !answers[i]);
    if (unanswered) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }

    setIsSubmitting(true);
    try {
      const results = currentQuestionnaire.questions.map((_, i) => ({
        answer: answers[i]
      }));

      const res = await fetch(`/api/questionnaire/${currentQuestionnaire.id}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, results }),
      });

      if (res.ok) {
        setView('SUCCESS');
        setTimeout(() => {
          setView('LIST');
          fetchQuestionnaires();
        }, 3000);
      } else {
        alert('Failed to submit questionnaire.');
      }
    } catch (e) {
      console.error('Submit questionnaire error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AnimatePresence mode="wait">
        {view === 'LIST' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto pt-20 px-6 pb-20"
          >
            <div className="text-center mb-16">
              <button 
                onClick={onExit}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white mb-8 transition-colors"
              >
                ← Back to Selection
              </button>
              <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                QUESTIONNAIRES
              </h1>
              <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-2xl max-w-2xl mx-auto flex gap-4 text-left">
                <Info className="w-6 h-6 text-purple-500 shrink-0" />
                <p className="text-sm text-purple-200/70">
                  These surveys are strictly anonymous. Please do <strong>not</strong> include any personal information such as your name, email, or ID number. Your nickname is the only identifier used.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {questionnaires.length > 0 ? (
                questionnaires.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => selectQuestionnaire(q.id)}
                    className="flex items-center justify-between p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-purple-500/50 transition-all text-left"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold">{q.title}</h3>
                        {q.completed && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <p className="text-zinc-500 text-sm">Questionnaire ID: {q.id}</p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-purple-500" />
                  </button>
                ))
              ) : (
                <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-3xl">
                  <p className="text-zinc-500">No questionnaires available at the moment.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'VIEW' && currentQuestionnaire && (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-3xl mx-auto pt-20 px-6 pb-32"
          >
            <div className="mb-12">
              <button 
                onClick={() => setView('LIST')}
                className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white mb-8 transition-colors"
              >
                ← Back to List
              </button>
              <h1 className="text-4xl font-black mb-4">{currentQuestionnaire.title}</h1>
              <p className="text-zinc-400 leading-relaxed">{currentQuestionnaire.instructions}</p>
            </div>

            <div className="space-y-12">
              {currentQuestionnaire.questions.map((q, i) => (
                <div key={i} className="space-y-6">
                  <h3 className="text-xl font-bold flex gap-4">
                    <span className="text-purple-500 font-mono">Q{i + 1}.</span>
                    {q.question}
                  </h3>
                  
                  <div className="space-y-4 pl-12">
                    {q.hasOptions && (
                      <div className="grid gap-3">
                        {q.options.map((opt, optIdx) => (
                          <label 
                            key={optIdx}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                              answers[i] === opt 
                                ? "bg-purple-500/10 border-purple-500 text-purple-100" 
                                : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
                            )}
                          >
                            <input 
                              type="radio" 
                              name={`q-${i}`} 
                              value={opt}
                              checked={answers[i] === opt}
                              onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                              className="w-4 h-4 accent-purple-500"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    )}

                    {q.freeText && (
                      <textarea
                        placeholder="Type your answer here..."
                        value={answers[i] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 focus:outline-none focus:border-purple-500 transition-colors min-h-[120px]"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 pt-12 border-t border-zinc-800 space-y-6">
              <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Info className="w-4 h-4" />
                <p className="text-xs uppercase tracking-widest font-bold">All questions must be answered to submit</p>
              </div>
              <AnimatePresence>
                {showWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400"
                  >
                    <Info className="w-5 h-5" />
                    <p className="text-sm font-bold">Please fill out all questions before submitting.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={submitQuestionnaire}
                disabled={isSubmitting}
                className={cn(
                  "w-full font-black py-6 rounded-3xl transition-all flex items-center justify-center gap-3 text-xl",
                  showWarning 
                    ? "bg-red-600 hover:bg-red-500 text-white animate-shake" 
                    : "bg-purple-600 hover:bg-purple-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500"
                )}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Questionnaire'}
                {!isSubmitting && <ArrowRight className="w-6 h-6" />}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-md w-full">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              </div>
              <h1 className="text-4xl font-black mb-4">QUESTIONNAIRE SUBMITTED</h1>
              <p className="text-zinc-400 text-xl mb-12">Thank you for your participation!</p>
              <p className="text-zinc-600 text-sm animate-pulse">Returning to list...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
