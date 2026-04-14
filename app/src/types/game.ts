export type GameState = 
  | 'LOGIN' 
  | 'GAME_SELECT' 
  | 'DOT_MEMORY_SETTINGS' 
  | 'DOT_MEMORY_INSTRUCTIONS' 
  | 'DOT_MEMORY_PRE_START' 
  | 'COUNTDOWN' 
  | 'SHOW_DOTS' 
  | 'PLACE_DOTS' 
  | 'SHOW_SOLUTION' 
  | 'FINISHED' 
  | 'PATH_TRACING_SETTINGS' 
  | 'PATH_TRACING_INSTRUCTIONS' 
  | 'PATH_TRACING_PRE_START' 
  | 'PATH_TRACING_GAME' 
  | 'TRACKING_SETTINGS' 
  | 'TRACKING_INSTRUCTIONS' 
  | 'TRACKING_PRE_START' 
  | 'TRACKING_GAME' 
  | 'FINGER_TAPPING_SETTINGS' 
  | 'FINGER_TAPPING_INSTRUCTIONS' 
  | 'FINGER_TAPPING_PRE_START' 
  | 'FINGER_TAPPING_GAME' 
  | 'PREDICTION_SETTINGS' 
  | 'PREDICTION_INSTRUCTIONS' 
  | 'PREDICTION_PRE_START' 
  | 'PREDICTION_GAME' 
  | 'PATTERN_MATCHING_SETTINGS' 
  | 'PATTERN_MATCHING_INSTRUCTIONS' 
  | 'PATTERN_MATCHING_GAME' 
  | 'QUESTIONNAIRE_LIST' 
  | 'QUESTIONNAIRE_VIEW' 
  | 'QUESTIONNAIRE_SUCCESS';

export interface Dot {
  x: number;
  y: number;
}

export interface LeaderboardEntry {
  nickname: string;
  score: number;
}

export interface Questionnaire {
  id: string;
  title: string;
  instructions: string;
  completed?: boolean;
  questions: {
    question: string;
    freeText: boolean;
    hasOptions: boolean;
    options: string[];
  }[];
}

export type GameType = 'Dot Memory' | 'Path Tracing' | 'Tracking' | 'Finger Tapping' | 'Prediction' | 'Pattern Matching' | 'Questionnaires';
