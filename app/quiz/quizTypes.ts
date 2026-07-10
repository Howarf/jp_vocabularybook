export type QuizScene = "setup" | "question" | "result";
export type QuizSourceType = "vocabularyBook" | "allWords";
export type QuizLevel = "N5" | "N4" | "N3";
export type QuizQuestionMode = "wordToMeaning" | "meaningToWord" | "random";
export type QuizResolvedQuestionMode = Exclude<QuizQuestionMode, "random">;

export type QuizSetup = {
  sourceType: QuizSourceType;
  vocabularyBookId: string | null;
  level: QuizLevel;
  questionCount: number;
  questionMode: QuizQuestionMode;
};

export type QuizQuestion = {
  wordId: number;
  vocabularyBookWordId: string | null;
  expression: string;
  reading: string | null;
  meaningKo: string;
  questionText: string;
  correctAnswer: string;
  choices: string[];
  mode: QuizResolvedQuestionMode;
};

export type QuizAnswer = {
  wordId: number;
  vocabularyBookWordId: string | null;
  expression: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export type QuizResultApplyMode =
  | "saveCountsOnly"
  | "markCorrectAsLearned"
  | "markCorrectAsLearnedAndWrongAsLearning";

export type ApplyQuizResultResult = {
  didSaveQuizResult: boolean;
  shouldOpenCompletionModal: boolean;
};
