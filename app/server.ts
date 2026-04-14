import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const RESULTS_DIR = path.join(process.cwd(), 'results');
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const DOT_MEMORY_CSV = path.join(RESULTS_DIR, 'results_dot_memory.csv');
const PATH_TRACING_CSV = path.join(RESULTS_DIR, 'results_path_tracing.csv');
const TRACKING_CSV = path.join(RESULTS_DIR, 'results_tracking.csv');
const FINGER_TAPPING_CSV = path.join(RESULTS_DIR, 'results_finger_tapping.csv');
const PREDICTION_CSV = path.join(RESULTS_DIR, 'results_prediction.csv');
const PATTERN_MATCHING_CSV = path.join(RESULTS_DIR, 'results_pattern_matching.csv');
const LOGIN_CSV = path.join(RESULTS_DIR, 'login.csv');

const GAME_CONFIG: Record<string, { path: string, headers: string }> = {
  'Dot Memory': {
    path: DOT_MEMORY_CSV,
    headers: 'nickname,attempt,trial,score,time,repetitions,dots,countdown_duration,presentation_time,solution_time\n'
  },
  'Path Tracing': {
    path: PATH_TRACING_CSV,
    headers: 'nickname,attempt,trial,score,time,repetitions,drift_force,circle_size,time_limit\n'
  },
  'Tracking': {
    path: TRACKING_CSV,
    headers: 'nickname,attempt,trial,score,time,repetitions,shifts,speed_range,duration_variance,time_limit,circle_size\n'
  },
  'Finger Tapping': {
    path: FINGER_TAPPING_CSV,
    headers: 'nickname,attempt,trial,score,time,repetitions,time_limit,sequence_length\n'
  },
  'Prediction': {
    path: PREDICTION_CSV,
    headers: 'nickname,attempt,trial,score,time,time_limit,reliability_set,raw_score\n'
  },
  'Pattern Matching': {
    path: PATTERN_MATCHING_CSV,
    headers: 'nickname,attempt,trial,score,time,total_trials,shifts_per_trial,streak_range,total_correct,total_wrong\n'
  }
};

const QUESTIONNAIRE_RESULTS_PATH = path.join(RESULTS_DIR, 'results_questionnaires.csv');
const QUESTIONNAIRE_RESULTS_HEADERS = 'nickname,timestamp,questionnaire_id,questionnaire_title,results_json\n';

const LOGIN_HEADERS = 'nickname,password\n';

function ensureFileWithHeaders(filePath: string, headers: string) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, headers);
  } else {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.trim().length === 0) {
      fs.writeFileSync(filePath, headers);
    } else {
      // Ensure it ends with newline for safe appending
      if (!content.endsWith('\n')) {
        fs.appendFileSync(filePath, '\n');
      }
    }
  }
}

ensureFileWithHeaders(LOGIN_CSV, LOGIN_HEADERS);
ensureFileWithHeaders(QUESTIONNAIRE_RESULTS_PATH, QUESTIONNAIRE_RESULTS_HEADERS);

Object.values(GAME_CONFIG).forEach(config => {
  ensureFileWithHeaders(config.path, config.headers);
});

function getLoginRecords(): { nickname: string, password: string }[] {
  if (!fs.existsSync(LOGIN_CSV)) return [];
  const fileContent = fs.readFileSync(LOGIN_CSV, 'utf-8');
  try {
    return parse(fileContent, { 
      columns: true, 
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      bom: true
    });
  } catch (e) {
    console.error('Error parsing login.csv:', e);
    return [];
  }
}

function getGameRecords(game: string): any[] {
  const config = GAME_CONFIG[game];
  if (!config || !fs.existsSync(config.path)) return [];
  const fileContent = fs.readFileSync(config.path, 'utf-8');
  return parse(fileContent, { 
    columns: true, 
    skip_empty_lines: true,
    relax_column_count: true
  });
}

function getAllGameRecords(): any[] {
  let allRecords: any[] = [];
  Object.keys(GAME_CONFIG).forEach(game => {
    const records = getGameRecords(game).map(r => ({ ...r, game }));
    allRecords = allRecords.concat(records);
  });
  return allRecords;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve the images folder
  const imagesPath = path.join(process.cwd(), 'images');
  if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  app.use('/images', express.static(imagesPath));

  const questionnairesPath = path.join(process.cwd(), 'questionnaires');
  if (!fs.existsSync(questionnairesPath)) {
    fs.mkdirSync(questionnairesPath, { recursive: true });
  }

  // API Routes
  app.get('/api/questionnaires', (req, res) => {
    const { nickname } = req.query;
    try {
      const files = fs.readdirSync(questionnairesPath);
      const questionnaires = files
        .filter(f => f.startsWith('quest_') && f.endsWith('.csv'))
        .map(f => {
          const id = f.replace('quest_', '').replace('.csv', '');
          const content = fs.readFileSync(path.join(questionnairesPath, f), 'utf-8').split('\n');
          
          let completed = false;
          if (nickname) {
            const resultsPath = path.join(questionnairesPath, `results_quest_${id}.csv`);
            if (fs.existsSync(resultsPath)) {
              const resultsContent = fs.readFileSync(resultsPath, 'utf-8');
              const records = parse(resultsContent, { columns: true, skip_empty_lines: true, relax_column_count: true });
              completed = records.some((r: any) => r.nickname === nickname);
            }
          }

          return {
            id,
            title: content[0]?.trim() || `Questionnaire ${id}`,
            completed
          };
        });
      res.json(questionnaires);
    } catch (error) {
      console.error('List questionnaires error:', error);
      res.status(500).json({ error: 'Failed to list questionnaires' });
    }
  });

  app.get('/api/questionnaire/:id', (req, res) => {
    const { id } = req.params;
    const filePath = path.join(questionnairesPath, `quest_${id}.csv`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8').split('\n');
      const title = content[0]?.trim();
      const instructions = content[1]?.trim();
      const questions = content.slice(2)
        .filter(line => line.trim().length > 0)
        .map(line => {
          const parts = line.split(',');
          return {
            question: parts[0]?.trim(),
            freeText: parts[1]?.trim().toLowerCase() === 'yes',
            hasOptions: parts[2]?.trim().toLowerCase() === 'yes',
            options: parts.slice(3).map(o => o.trim()).filter(o => o.length > 0)
          };
        });

      res.json({ id, title, instructions, questions });
    } catch (error) {
      console.error('Get questionnaire error:', error);
      res.status(500).json({ error: 'Failed to get questionnaire' });
    }
  });

  app.post('/api/questionnaire/:id/results', (req, res) => {
    const { id } = req.params;
    const { nickname, results } = req.body;
    const resultsPath = path.join(questionnairesPath, `results_quest_${id}.csv`);

    try {
      // Get title for the record
      let title = id;
      const filePath = path.join(questionnairesPath, `quest_${id}.csv`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8').split('\n');
        title = content[0].trim();
      }

      // 1. Save to individual questionnaire result file (legacy/detailed)
      if (!fs.existsSync(resultsPath)) {
        const headers = ['nickname', 'timestamp', 'questionnaire_id', 'questionnaire_title', ...results.map((r: any, i: number) => `q${i+1}_answer`)];
        fs.writeFileSync(resultsPath, stringify([headers]));
      }
      const row = [nickname, new Date().toISOString(), id, title, ...results.map((r: any) => r.answer)];
      fs.appendFileSync(resultsPath, stringify([row]));

      // 2. Also save to the master questionnaire results file
      const masterRow = [nickname, new Date().toISOString(), id, title, JSON.stringify(results)];
      fs.appendFileSync(QUESTIONNAIRE_RESULTS_PATH, stringify([masterRow]));

      res.json({ success: true });
    } catch (error) {
      console.error('Save questionnaire results error:', error);
      res.status(500).json({ error: 'Failed to save questionnaire results' });
    }
  });

  app.get('/api/leaderboard', (req, res) => {
    const gameName = req.query.game as string || 'Dot Memory';
    
    try {
      const records = getGameRecords(gameName);
      if (records.length === 0) return res.json([]);
      
      // Calculate top scores per nickname
      const userAttempts: Record<string, { nickname: string; totalScore: number; trials: number; expectedTrials: number }> = {};
      records.forEach(r => {
        if (!r.nickname || !r.attempt) return;
        const key = `${r.nickname}-${r.attempt}`;
        if (!userAttempts[key]) {
          userAttempts[key] = { 
            nickname: r.nickname, 
            totalScore: 0, 
            trials: 0, 
            expectedTrials: parseInt(r.repetitions) || 10 
          };
        }

        const baseScore = parseFloat(r.score) || 0;
        userAttempts[key].totalScore += baseScore;
        userAttempts[key].trials += 1;
      });

      const userBestScores: Record<string, number> = {};
      Object.values(userAttempts).forEach(a => {
        if (a.trials === a.expectedTrials) {
          const avgScore = a.totalScore / a.trials;
          if (!userBestScores[a.nickname] || avgScore > userBestScores[a.nickname]) {
            userBestScores[a.nickname] = avgScore;
          }
        }
      });

      const leaderboard = Object.entries(userBestScores)
        .map(([nickname, score]) => ({ nickname, score: Math.round(score) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      res.json(leaderboard);
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Failed to read leaderboard' });
    }
  });

  app.get('/api/stats', (req, res) => {
    const gameName = req.query.game as string || 'Dot Memory';
    const nickname = req.query.nickname as string;
    
    try {
      const records = getGameRecords(gameName);
      if (records.length === 0) return res.json({ globalStats: [], userAttempts: [] });
      
      // Filter by same settings (ignoring repetitions)
      const filtered = records.filter(r => {
        if (gameName === 'Dot Memory') {
          return parseInt(r.dots) === parseInt(req.query.dots as string) &&
                 parseInt(r.countdown_duration) === parseInt(req.query.countdown_duration as string) &&
                 parseInt(r.presentation_time) === parseInt(req.query.presentation_time as string) &&
                 parseInt(r.solution_time) === parseInt(req.query.solution_time as string);
        } else if (gameName === 'Path Tracing') {
          return parseFloat(r.drift_force).toFixed(1) === parseFloat(req.query.drift_force as string).toFixed(1) &&
                 parseInt(r.circle_size) === parseInt(req.query.circle_size as string) &&
                 parseInt(r.time_limit) === parseInt(req.query.time_limit as string);
        } else if (gameName === 'Tracking') {
          return parseInt(r.shifts) === parseInt(req.query.shifts as string) &&
                 r.speed_range === req.query.speed_range &&
                 parseInt(r.duration_variance) === parseInt(req.query.duration_variance as string) &&
                 parseInt(r.time_limit) === parseInt(req.query.time_limit as string) &&
                 parseInt(r.circle_size) === parseInt(req.query.circle_size as string);
        } else if (gameName === 'Finger Tapping') {
          return parseInt(r.time_limit) === parseInt(req.query.time_limit as string) &&
                 parseInt(r.sequence_length) === parseInt(req.query.sequence_length as string);
        } else if (gameName === 'Prediction') {
          return parseInt(r.time_limit) === parseInt(req.query.time_limit as string) &&
                 r.reliability_set === req.query.reliability_set;
        } else if (gameName === 'Pattern Matching') {
          return parseInt(r.total_trials) === parseInt(req.query.total_trials as string) &&
                 r.shifts_per_trial === req.query.shifts_per_trial &&
                 r.streak_range === req.query.streak_range;
        }
        return false;
      });

      // Global Stats per trial
      const trials: Record<number, number[]> = {};
      filtered.forEach(r => {
        const t = parseInt(r.trial);
        if (!trials[t]) trials[t] = [];
        trials[t].push(parseFloat(r.score));
      });

      const globalStats = Object.entries(trials).map(([trial, scores]) => {
        const n = scores.length;
        const avg = scores.reduce((a, b) => a + b, 0) / n;
        const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (n > 1 ? n - 1 : 1);
        const stdDev = Math.sqrt(variance);
        const stdErr = stdDev / Math.sqrt(n);
        
        return {
          trial: parseInt(trial),
          avgScore: parseFloat(avg.toFixed(2)),
          stdErr: parseFloat(stdErr.toFixed(2)),
          n
        };
      }).sort((a, b) => a.trial - b.trial);

      // User's previous attempts
      const userAttemptsMap: Record<string, number[]> = {};
      const userAttemptsRawMap: Record<string, number[]> = {};
      if (nickname) {
        filtered.filter(r => r.nickname === nickname).forEach(r => {
          const attemptId = r.attempt;
          if (!userAttemptsMap[attemptId]) userAttemptsMap[attemptId] = [];
          const t = parseInt(r.trial);
          userAttemptsMap[attemptId][t - 1] = parseFloat(r.score);
          if (!userAttemptsRawMap[attemptId]) userAttemptsRawMap[attemptId] = [];
          userAttemptsRawMap[attemptId][t - 1] = parseFloat(r.raw_score) || 0;
        });
      }

      const userAttempts = Object.entries(userAttemptsMap).map(([attempt, scores]) => ({
        attempt: parseInt(attempt),
        scores,
        rawScores: userAttemptsRawMap[attempt] || []
      }));

      res.json({ globalStats, userAttempts });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to calculate stats' });
    }
  });

  app.post('/api/auth', (req, res) => {
    let { nickname, password } = req.body;
    if (!nickname || !password) {
      return res.status(400).json({ error: 'Nickname and password are required' });
    }

    nickname = nickname.trim();
    password = password.trim();

    if (nickname.length < 6) {
      return res.status(400).json({ error: 'Nickname must be at least 6 characters' });
    }

    try {
      const loginRecords = getLoginRecords();
      // Case-insensitive search for trimmed nickname
      const userLogin = loginRecords.find(r => 
        r.nickname && r.nickname.trim().toLowerCase() === nickname.toLowerCase()
      );
      
      if (userLogin) {
        // Check password (also trimmed from CSV)
        if (userLogin.password.trim() !== password) {
          return res.status(401).json({ error: 'Incorrect password for this nickname' });
        }
      } else {
        // New user, save to login.csv
        fs.appendFileSync(LOGIN_CSV, stringify([[nickname, password]]));
      }

      return res.json({ nickname });
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ error: 'Auth failed' });
    }
  });

  app.get('/api/next-attempt', (req, res) => {
    const { game, nickname } = req.query;
    if (!game || !nickname) {
      return res.status(400).json({ error: 'Missing game or nickname' });
    }

    try {
      const records = getGameRecords(game as string);
      // Attempt = count of trial 1 for this user + 1
      const userStarts = records.filter(r => 
        r.nickname.toLowerCase() === (nickname as string).toLowerCase() && 
        parseInt(r.trial) === 1
      );
      res.json({ nextAttempt: userStarts.length + 1 });
    } catch (error) {
      console.error('Next attempt error:', error);
      res.status(500).json({ error: 'Failed to get next attempt' });
    }
  });

  app.post('/api/results', (req, res) => {
    const { 
      game, nickname, attempt, trial, score, time,
      repetitions, dots, countdown_duration, presentation_time, solution_time,
      drift_force, circle_size, time_limit, shifts, speed_range, duration_variance,
      sequence_length, reliability_set, raw_score, total_trials, shifts_per_trial,
      streak_range, total_correct, total_wrong
    } = req.body;
    
    const config = GAME_CONFIG[game];
    if (!config) {
      return res.status(400).json({ error: 'Invalid game name' });
    }

    try {
      let row: any[] = [];
      if (game === 'Dot Memory') {
        row = [nickname, attempt, trial, score, time, repetitions, dots, countdown_duration, presentation_time, solution_time];
      } else if (game === 'Path Tracing') {
        row = [nickname, attempt, trial, score, time, repetitions, drift_force, circle_size, time_limit];
      } else if (game === 'Tracking') {
        row = [nickname, attempt, trial, score, time, repetitions, shifts, speed_range, duration_variance, time_limit, circle_size];
      } else if (game === 'Finger Tapping') {
        row = [nickname, attempt, trial, score, time, repetitions, time_limit, sequence_length];
      } else if (game === 'Prediction') {
        row = [nickname, attempt, trial, score, time, time_limit, reliability_set, raw_score];
      } else if (game === 'Pattern Matching') {
        row = [nickname, attempt, trial, score, time, total_trials, shifts_per_trial, streak_range, total_correct, total_wrong];
      }

      fs.appendFileSync(config.path, stringify([row]));
      res.json({ success: true });
    } catch (error) {
      console.error('Save result error:', error);
      res.status(500).json({ error: 'Failed to save result' });
    }
  });

  app.get('/api/view-csv', (req, res) => {
    const password = req.query.password;
    const game = req.query.game;
    if (password !== 'learning_rate_admin') {
      return res.status(403).send('Forbidden: Invalid password');
    }
    
    let csvPath = DOT_MEMORY_CSV;
    let fileName = 'results_dot_memory.csv';
    if (game === 'path_tracing') {
      csvPath = PATH_TRACING_CSV;
      fileName = 'results_path_tracing.csv';
    } else if (game === 'tracking') {
      csvPath = TRACKING_CSV;
      fileName = 'results_tracking.csv';
    } else if (game === 'finger_tapping') {
      csvPath = FINGER_TAPPING_CSV;
      fileName = 'results_finger_tapping.csv';
    } else if (game === 'prediction') {
      csvPath = PREDICTION_CSV;
      fileName = 'results_prediction.csv';
    } else if (game === 'pattern_matching') {
      csvPath = PATTERN_MATCHING_CSV;
      fileName = 'results_pattern_matching.csv';
    } else if (game === 'login') {
      csvPath = LOGIN_CSV;
      fileName = 'login.csv';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(csvPath);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
