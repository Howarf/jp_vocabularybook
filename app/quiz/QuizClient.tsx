"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppHeader from "@/src/components/AppHeader";
import { supabase } from "@/src/lib/supabaseClient";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";
import type { VocabularyBookWordWithWord, WordPartOfSpeech, WordRow } from "@/src/types/vocabulary";
import { createVocabularyBookForUser } from "@/src/utils/vocabularyBook";
import { getJlptDatabaseTag, normalizeJoinedWord } from "@/src/utils/word";
import sharedStyles from "../shared.module.css";
import QuizQuestionScene from "./QuizQuestionScene";
import QuizResultScene from "./QuizResultScene";
import QuizSetupScene from "./QuizSetupScene";
import styles from "./quiz.module.css";

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

type QuizCandidate = {
  wordId: number;
  vocabularyBookWordId: string | null;
  expression: string;
  reading: string | null;
  meaningKo: string;
  tag: string | null;
  partOfSpeech: WordPartOfSpeech | null;
};

type SaveQuizResultOutcome = {
  errorMessage: string;
  status: "success" | "partial" | "failed";
};

type QuizClientProps = {
  initialVocabularyBookId?: string | null;
};

const initialQuizSetup: QuizSetup = {
  sourceType: "vocabularyBook",
  vocabularyBookId: null,
  level: "N5",
  questionCount: 20,
  questionMode: "random",
};

const similarChoiceCandidateLimit = 10;

const similarityScoreWeights = {
  partOfSpeech: 20,
  tag: 20,
  reading: 10,
  expression: 10,
  meaning: 60,
} as const;

// 배열을 무작위 순서로 섞은 새 배열로 반환합니다.
function shuffleItems<T>(items: T[]) {
  const shuffledItems = [...items];

  for (let currentIndex = shuffledItems.length - 1; currentIndex > 0; currentIndex -= 1) {
    const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
    [shuffledItems[currentIndex], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[currentIndex],
    ];
  }

  return shuffledItems;
}

// 퀴즈 설정에 맞는 실제 문제 방식을 결정합니다.
function resolveQuestionMode(questionMode: QuizQuestionMode): QuizResolvedQuestionMode {
  if (questionMode !== "random") {
    return questionMode;
  }

  return Math.random() > 0.5 ? "wordToMeaning" : "meaningToWord";
}

// 비교할 문자열을 유사도 계산에 맞게 정리합니다.
function normalizeSimilarityText(text: string | null) {
  return (text ?? "").trim().toLowerCase();
}

// 문자열을 의미 비교에 사용할 작은 토큰 목록으로 나눕니다.
function createMeaningSimilarityTokens(text: string) {
  return normalizeSimilarityText(text)
    .split(/[\s,.;/()·，、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

// 문자열을 형태 비교에 사용할 2글자 단위 목록으로 나눕니다.
function createCharacterBigrams(text: string | null) {
  const normalizedText = normalizeSimilarityText(text).replace(/\s+/g, "");

  if (normalizedText.length <= 1) {
    return normalizedText ? [normalizedText] : [];
  }

  return Array.from({ length: normalizedText.length - 1 }, (_, index) =>
    normalizedText.slice(index, index + 2),
  );
}

// 두 문자열 목록의 자카드 유사도를 계산합니다.
function calculateJaccardSimilarity(firstValues: string[], secondValues: string[]) {
  if (firstValues.length === 0 || secondValues.length === 0) {
    return 0;
  }

  const firstValueSet = new Set(firstValues);
  const secondValueSet = new Set(secondValues);
  const intersectionCount = [...firstValueSet].filter((value) => secondValueSet.has(value)).length;
  const unionCount = new Set([...firstValueSet, ...secondValueSet]).size;

  return unionCount > 0 ? intersectionCount / unionCount : 0;
}

// 두 단어의 읽기 유사도를 점수로 계산합니다.
function calculateReadingSimilarityScore(candidate: QuizCandidate, choiceCandidate: QuizCandidate) {
  const candidateReading = normalizeSimilarityText(candidate.reading);
  const choiceCandidateReading = normalizeSimilarityText(choiceCandidate.reading);

  if (!candidateReading || !choiceCandidateReading) {
    return 0;
  }

  if (candidateReading === choiceCandidateReading) {
    return similarityScoreWeights.reading;
  }

  return calculateJaccardSimilarity(
    createCharacterBigrams(candidateReading),
    createCharacterBigrams(choiceCandidateReading),
  ) * similarityScoreWeights.reading;
}

// 두 단어의 형태 유사도를 점수로 계산합니다.
function calculateExpressionSimilarityScore(candidate: QuizCandidate, choiceCandidate: QuizCandidate) {
  return calculateJaccardSimilarity(
    createCharacterBigrams(candidate.expression),
    createCharacterBigrams(choiceCandidate.expression),
  ) * similarityScoreWeights.expression;
}

// 두 단어의 의미 유사도를 점수로 계산합니다.
function calculateMeaningSimilarityScore(candidate: QuizCandidate, choiceCandidate: QuizCandidate) {
  const meaningTokenSimilarity = calculateJaccardSimilarity(
    createMeaningSimilarityTokens(candidate.meaningKo),
    createMeaningSimilarityTokens(choiceCandidate.meaningKo),
  );

  if (meaningTokenSimilarity > 0) {
    return meaningTokenSimilarity * similarityScoreWeights.meaning;
  }

  return calculateJaccardSimilarity(
    createCharacterBigrams(candidate.meaningKo),
    createCharacterBigrams(choiceCandidate.meaningKo),
  ) * similarityScoreWeights.meaning;
}

// 두 단어의 품사, 등급, 읽기, 형태, 의미 기준 유사도 총점을 계산합니다.
function calculateChoiceSimilarityScore(candidate: QuizCandidate, choiceCandidate: QuizCandidate) {
  const partOfSpeechScore =
    candidate.partOfSpeech && candidate.partOfSpeech === choiceCandidate.partOfSpeech
      ? similarityScoreWeights.partOfSpeech
      : 0;
  const tagScore =
    candidate.tag && candidate.tag === choiceCandidate.tag ? similarityScoreWeights.tag : 0;

  return (
    partOfSpeechScore +
    tagScore +
    calculateReadingSimilarityScore(candidate, choiceCandidate) +
    calculateExpressionSimilarityScore(candidate, choiceCandidate) +
    calculateMeaningSimilarityScore(candidate, choiceCandidate)
  );
}

// 문제 단어와 비슷한 오답 후보를 상위권에서 무작위로 선택합니다.
function createSimilarWrongChoices(
  candidate: QuizCandidate,
  choiceCandidates: QuizCandidate[],
  resolvedQuestionMode: QuizResolvedQuestionMode,
  correctAnswer: string,
) {
  const usedChoiceValues = new Set([correctAnswer]);
  const rankedChoiceCandidates = choiceCandidates
    .filter((choiceCandidate) => choiceCandidate.wordId !== candidate.wordId)
    .map((choiceCandidate) => ({
      choiceCandidate,
      choiceValue: resolvedQuestionMode === "wordToMeaning"
        ? choiceCandidate.meaningKo
        : choiceCandidate.expression,
      similarityScore: calculateChoiceSimilarityScore(candidate, choiceCandidate),
    }))
    .filter(({ choiceValue }) => choiceValue !== correctAnswer)
    .sort((firstCandidate, secondCandidate) => secondCandidate.similarityScore - firstCandidate.similarityScore);

  const similarWrongChoices = rankedChoiceCandidates
    .filter(({ choiceValue }) => {
      if (usedChoiceValues.has(choiceValue)) {
        return false;
      }

      usedChoiceValues.add(choiceValue);
      return true;
    })
    .slice(0, similarChoiceCandidateLimit);

  const selectedWrongChoices = shuffleItems(similarWrongChoices).slice(0, 3).map(({ choiceValue }) => choiceValue);

  if (selectedWrongChoices.length >= 3) {
    return selectedWrongChoices;
  }

  const fallbackWrongChoices = rankedChoiceCandidates
    .filter(({ choiceValue }) => !usedChoiceValues.has(choiceValue))
    .map(({ choiceValue }) => choiceValue);

  return [...selectedWrongChoices, ...shuffleItems(fallbackWrongChoices).slice(0, 3 - selectedWrongChoices.length)];
}

// 후보 단어와 유사 선택지 후보를 사용해 객관식 문제 하나를 만듭니다.
function createQuizQuestion(
  candidate: QuizCandidate,
  choiceCandidates: QuizCandidate[],
  questionMode: QuizQuestionMode,
): QuizQuestion {
  const resolvedQuestionMode = resolveQuestionMode(questionMode);
  const correctAnswer = resolvedQuestionMode === "wordToMeaning" ? candidate.meaningKo : candidate.expression;
  const questionText = resolvedQuestionMode === "wordToMeaning" ? candidate.expression : candidate.meaningKo;
  const wrongChoices = createSimilarWrongChoices(
    candidate,
    choiceCandidates,
    resolvedQuestionMode,
    correctAnswer,
  );
  const choices = shuffleItems([correctAnswer, ...wrongChoices]);

  return {
    wordId: candidate.wordId,
    vocabularyBookWordId: candidate.vocabularyBookWordId,
    expression: candidate.expression,
    reading: candidate.reading,
    meaningKo: candidate.meaningKo,
    questionText,
    correctAnswer,
    choices,
    mode: resolvedQuestionMode,
  };
}

// 단어장 조인 결과를 퀴즈 후보 단어로 변환합니다.
function createCandidateFromVocabularyBookWord(vocabularyBookWord: VocabularyBookWordWithWord): QuizCandidate | null {
  const word = normalizeJoinedWord(vocabularyBookWord.words);

  if (!word) {
    return null;
  }

  return {
    wordId: word.id,
    vocabularyBookWordId: vocabularyBookWord.id,
    expression: word.expression,
    reading: word.reading,
    meaningKo: word.meaning_ko,
    tag: word.tag,
    partOfSpeech: word.part_of_speech,
  };
}

// 전체 단어 행을 퀴즈 후보 단어로 변환합니다.
function createCandidateFromWord(word: WordRow): QuizCandidate {
  return {
    wordId: word.id,
    vocabularyBookWordId: null,
    expression: word.expression,
    reading: word.reading,
    meaningKo: word.meaning_ko,
    tag: word.tag,
    partOfSpeech: word.part_of_speech,
  };
}

// 퀴즈 설정에 맞게 단어장 또는 전체 단어에서 후보 단어를 가져옵니다.
async function fetchQuizCandidates(quizSetup: QuizSetup) {
  if (quizSetup.sourceType === "vocabularyBook") {
    if (!quizSetup.vocabularyBookId) {
      return { candidates: [], errorMessage: "퀴즈를 시작할 단어장을 선택해 주세요." };
    }

    const { data, error } = await supabase
      .from("vocabulary_book_words")
      .select("id,book_id,word_id,status,correct_count,wrong_count,created_at,last_quizzed_at,words(*)")
      .eq("book_id", quizSetup.vocabularyBookId)
      .or("status.is.null,status.eq.false")
      .order("wrong_count", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      return { candidates: [], errorMessage: `단어장 단어를 불러오지 못했습니다. ${error.message}` };
    }

    return {
      candidates: ((data ?? []) as VocabularyBookWordWithWord[])
        .map(createCandidateFromVocabularyBookWord)
        .filter((candidate): candidate is QuizCandidate => Boolean(candidate)),
      errorMessage: "",
    };
  }

  const databaseTag = getJlptDatabaseTag(quizSetup.level);
  let query = supabase.from("words").select("*").limit(240);

  if (databaseTag) {
    query = query.eq("tag", databaseTag);
  }

  const { data, error } = await query;

  if (error) {
    return { candidates: [], errorMessage: `전체 단어를 불러오지 못했습니다. ${error.message}` };
  }

  return {
    candidates: (data ?? []).map(createCandidateFromWord),
    errorMessage: "",
  };
}

// 전체 단어 목록에서 퀴즈 선택지 후보를 불러옵니다.
async function fetchQuizChoiceCandidates() {
  const { data, error } = await supabase.from("words").select("*").limit(1000);

  if (error) {
    return { choiceCandidates: [], errorMessage: `선택지 후보 단어를 불러오지 못했습니다. ${error.message}` };
  }

  return {
    choiceCandidates: (data ?? []).map(createCandidateFromWord),
    errorMessage: "",
  };
}

// 퀴즈 후보 목록과 전체 선택지 후보에서 설정한 개수만큼 문제를 생성합니다.
function createQuizQuestions(
  candidates: QuizCandidate[],
  choiceCandidates: QuizCandidate[],
  quizSetup: QuizSetup,
) {
  return shuffleItems(candidates)
    .map((candidate) => createQuizQuestion(candidate, choiceCandidates, quizSetup.questionMode))
    .filter((quizQuestion) => quizQuestion.choices.length === 4)
    .slice(0, quizSetup.questionCount);
}

// 쿼리 문자열로 전달된 단어장 id를 초기 설정값에 반영합니다.
function createInitialQuizSetup(initialVocabularyBookId: string | null): QuizSetup {
  return {
    ...initialQuizSetup,
    vocabularyBookId: initialVocabularyBookId,
    sourceType: initialVocabularyBookId ? "vocabularyBook" : initialQuizSetup.sourceType,
  };
}

// 정답 반영 방식에 따라 다음 학습 상태를 계산합니다.
function getNextLearningStatus(
  currentStatus: boolean,
  isCorrect: boolean,
  resultApplyMode: QuizResultApplyMode,
) {
  if (resultApplyMode === "markCorrectAsLearnedAndWrongAsLearning" && !isCorrect) {
    return false;
  }

  if (
    (resultApplyMode === "markCorrectAsLearned" ||
      resultApplyMode === "markCorrectAsLearnedAndWrongAsLearning") &&
    isCorrect
  ) {
    return true;
  }

  return currentStatus;
}

// 단어장 퀴즈 결과 행을 저장합니다.
async function insertQuizResultRow(
  quizSetup: QuizSetup,
  quizAnswers: QuizAnswer[],
  resultApplyMode: QuizResultApplyMode,
  userId: string,
) {
  const correctAnswerCount = quizAnswers.filter((quizAnswer) => quizAnswer.isCorrect).length;
  const wrongAnswers = quizAnswers.filter((quizAnswer) => !quizAnswer.isCorrect);
  const masteredCount =
    resultApplyMode === "saveCountsOnly" ? 0 : quizAnswers.filter((quizAnswer) => quizAnswer.isCorrect).length;
  const accuracy = quizAnswers.length > 0 ? Math.round((correctAnswerCount / quizAnswers.length) * 100) : 0;
  const wrongWordIds = wrongAnswers
    .map((wrongAnswer) => wrongAnswer.vocabularyBookWordId)
    .filter((vocabularyBookWordId): vocabularyBookWordId is string => Boolean(vocabularyBookWordId));

  return supabase.from("quiz_results").insert({
    user_id: userId,
    vocabulary_book_id: quizSetup.vocabularyBookId as string,
    total_questions: quizAnswers.length,
    correct_count: correctAnswerCount,
    wrong_count: wrongAnswers.length,
    mastered_count: masteredCount,
    accuracy,
    wrong_word_ids: wrongWordIds,
  });
}

// 단어장 퀴즈 답안을 단어별 통계와 학습 상태에 반영합니다.
async function updateVocabularyBookWordResults(
  quizAnswers: QuizAnswer[],
  resultApplyMode: QuizResultApplyMode,
) {
  const vocabularyBookWordIds = quizAnswers
    .map((quizAnswer) => quizAnswer.vocabularyBookWordId)
    .filter((vocabularyBookWordId): vocabularyBookWordId is string => Boolean(vocabularyBookWordId));

  if (vocabularyBookWordIds.length === 0) {
    return { errorMessage: "결과를 반영할 단어장 단어가 없습니다." };
  }

  const { data: currentVocabularyBookWords, error: wordsError } = await supabase
    .from("vocabulary_book_words")
    .select("id,status,correct_count,wrong_count")
    .in("id", vocabularyBookWordIds);

  if (wordsError) {
    return { errorMessage: `단어별 통계를 불러오지 못했습니다. ${wordsError.message}` };
  }

  const currentVocabularyBookWordMap = new Map(
    (currentVocabularyBookWords ?? []).map((vocabularyBookWord) => [vocabularyBookWord.id, vocabularyBookWord]),
  );

  const updateResults = await Promise.all(
    quizAnswers.map((quizAnswer) => {
      if (!quizAnswer.vocabularyBookWordId) {
        return Promise.resolve({ error: null });
      }

      const currentVocabularyBookWord = currentVocabularyBookWordMap.get(quizAnswer.vocabularyBookWordId);
      const currentCorrectCount = currentVocabularyBookWord?.correct_count ?? 0;
      const currentWrongCount = currentVocabularyBookWord?.wrong_count ?? 0;
      const currentStatus = Boolean(currentVocabularyBookWord?.status);
      const nextStatus = getNextLearningStatus(currentStatus, quizAnswer.isCorrect, resultApplyMode);

      return supabase
        .from("vocabulary_book_words")
        .update({
          correct_count: currentCorrectCount + (quizAnswer.isCorrect ? 1 : 0),
          wrong_count: currentWrongCount + (quizAnswer.isCorrect ? 0 : 1),
          status: nextStatus,
          last_quizzed_at: new Date().toISOString(),
        })
        .eq("id", quizAnswer.vocabularyBookWordId);
    }),
  );

  const failedUpdate = updateResults.find((updateResult) => updateResult.error);

  if (failedUpdate?.error) {
    return { errorMessage: `단어별 결과를 저장하지 못했습니다. ${failedUpdate.error.message}` };
  }

  return { errorMessage: "" };
}

// 단어장 퀴즈 답안을 Supabase의 결과와 단어별 통계에 반영합니다.
async function saveVocabularyBookQuizResult(
  quizSetup: QuizSetup,
  quizAnswers: QuizAnswer[],
  resultApplyMode: QuizResultApplyMode,
): Promise<SaveQuizResultOutcome> {
  if (!quizSetup.vocabularyBookId) {
    return { errorMessage: "단어장 퀴즈만 결과를 저장할 수 있습니다.", status: "failed" };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      errorMessage: userError?.message ?? "사용자 정보를 확인하지 못했습니다.",
      status: "failed",
    };
  }

  const { error: quizResultError } = await insertQuizResultRow(quizSetup, quizAnswers, resultApplyMode, user.id);

  if (quizResultError) {
    return {
      errorMessage: `퀴즈 결과를 저장하지 못했습니다. 단어별 통계는 변경하지 않았습니다. ${quizResultError.message}`,
      status: "failed",
    };
  }

  const updateResult = await updateVocabularyBookWordResults(quizAnswers, resultApplyMode);

  if (updateResult.errorMessage) {
    return {
      errorMessage: `퀴즈 결과는 저장했지만 단어별 통계 반영에 실패했습니다. 중복 저장을 막기 위해 이 결과는 다시 저장할 수 없습니다. ${updateResult.errorMessage}`,
      status: "partial",
    };
  }

  return { errorMessage: "", status: "success" };
}

// 퀴즈의 세 가지 씬 전환과 풀이 상태를 관리합니다.
export default function QuizClient({ initialVocabularyBookId = null }: QuizClientProps) {
  const router = useRouter();
  const [currentScene, setCurrentScene] = useState<QuizScene>("setup");
  const [quizSetup, setQuizSetup] = useState<QuizSetup>(() => createInitialQuizSetup(initialVocabularyBookId));
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [hasCreatedWrongAnswerBook, setHasCreatedWrongAnswerBook] = useState(false);
  const [isCreatingWrongAnswerBook, setIsCreatingWrongAnswerBook] = useState(false);
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);
  const [isSavingQuizResult, setIsSavingQuizResult] = useState(false);
  const [hasSavedQuizResult, setHasSavedQuizResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [resultFeedbackMessage, setResultFeedbackMessage] = useState("");
  const vocabularyBooks = useVocabularyBookStore((state) => state.vocabularyBooks);
  const addVocabularyBook = useVocabularyBookStore((state) => state.addVocabularyBook);
  const loadVocabularyBooksForUser = useVocabularyBookStore((state) => state.loadVocabularyBooksForUser);

  const selectedVocabularyBookTitle = useMemo(
    () =>
      vocabularyBooks.find((vocabularyBook) => vocabularyBook.id === quizSetup.vocabularyBookId)?.title ??
      null,
    [quizSetup.vocabularyBookId, vocabularyBooks],
  );

  // 설정값을 저장하고 실제 문제를 생성한 뒤 문제 씬으로 이동합니다.
  const handleStartQuiz = async (nextQuizSetup: QuizSetup) => {
    setIsPreparingQuiz(true);
    setErrorMessage("");

    const { candidates, errorMessage: nextErrorMessage } = await fetchQuizCandidates(nextQuizSetup);

    if (nextErrorMessage) {
      setErrorMessage(nextErrorMessage);
      setIsPreparingQuiz(false);
      return;
    }

    if (candidates.length < 2) {
      setErrorMessage("퀴즈를 만들 수 있는 단어가 부족합니다. 최소 2개 이상의 단어가 필요합니다.");
      setIsPreparingQuiz(false);
      return;
    }

    const {
      choiceCandidates,
      errorMessage: choiceCandidateErrorMessage,
    } = await fetchQuizChoiceCandidates();

    if (choiceCandidateErrorMessage) {
      setErrorMessage(choiceCandidateErrorMessage);
      setIsPreparingQuiz(false);
      return;
    }

    if (choiceCandidates.length < 4) {
      setErrorMessage("4지선다 선택지를 만들 수 있는 전체 단어가 부족합니다. 최소 4개 이상의 단어가 필요합니다.");
      setIsPreparingQuiz(false);
      return;
    }

    const nextQuizQuestions = createQuizQuestions(candidates, choiceCandidates, nextQuizSetup);

    if (nextQuizQuestions.length === 0) {
      setErrorMessage("유사도 선택지를 포함한 4지선다 문제를 만들 수 없습니다.");
      setIsPreparingQuiz(false);
      return;
    }

    setQuizSetup(nextQuizSetup);
    setQuizQuestions(nextQuizQuestions);
    setQuizAnswers([]);
    setHasCreatedWrongAnswerBook(false);
    setHasSavedQuizResult(false);
    setResultFeedbackMessage("");
    setCurrentScene("question");
    setIsPreparingQuiz(false);
  };

  // 사용자의 선택 답안을 저장하고 다음 문제 또는 결과 씬으로 이동합니다.
  const handleSubmitAnswer = (quizQuestion: QuizQuestion, selectedAnswer: string) => {
    const nextQuizAnswer: QuizAnswer = {
      wordId: quizQuestion.wordId,
      vocabularyBookWordId: quizQuestion.vocabularyBookWordId,
      expression: quizQuestion.expression,
      selectedAnswer,
      correctAnswer: quizQuestion.correctAnswer,
      isCorrect: selectedAnswer === quizQuestion.correctAnswer,
    };

    setQuizAnswers((currentQuizAnswers) => [...currentQuizAnswers, nextQuizAnswer]);
  };

  // 모든 문제 풀이가 끝나면 결과 씬으로 이동합니다.
  const handleFinishQuiz = () => {
    setCurrentScene("result");
  };

  // 사용자가 선택한 방식으로 퀴즈 결과를 저장하고 단어 상태를 반영합니다.
  const handleApplyQuizResult = async (
    resultApplyMode: QuizResultApplyMode,
  ): Promise<ApplyQuizResultResult> => {
    if (hasSavedQuizResult) {
      setResultFeedbackMessage("이미 저장한 퀴즈 결과입니다.");
      return { didSaveQuizResult: false, shouldOpenCompletionModal: false };
    }

    if (quizSetup.sourceType !== "vocabularyBook") {
      setResultFeedbackMessage("전체 단어 퀴즈는 현재 결과 저장 대상이 아닙니다.");
      return { didSaveQuizResult: false, shouldOpenCompletionModal: false };
    }

    setIsSavingQuizResult(true);
    setResultFeedbackMessage("");

    const saveResult = await saveVocabularyBookQuizResult(quizSetup, quizAnswers, resultApplyMode);

    if (saveResult.status === "failed") {
      setResultFeedbackMessage(saveResult.errorMessage);
      setIsSavingQuizResult(false);
      return { didSaveQuizResult: false, shouldOpenCompletionModal: false };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await loadVocabularyBooksForUser(user.id, true);
    }

    if (saveResult.status === "partial") {
      setResultFeedbackMessage(saveResult.errorMessage);
      setHasSavedQuizResult(true);
      setIsSavingQuizResult(false);
      return { didSaveQuizResult: true, shouldOpenCompletionModal: false };
    }

    setResultFeedbackMessage("퀴즈 결과를 저장하고 단어 상태를 반영했습니다.");
    setHasSavedQuizResult(true);
    setIsSavingQuizResult(false);
    return { didSaveQuizResult: true, shouldOpenCompletionModal: true };
  };

  // 전체 단어 퀴즈에서 틀린 단어만 모아 새 단어장을 생성합니다.
  const handleCreateWrongAnswerBook = async () => {
    if (quizSetup.sourceType !== "allWords" || hasCreatedWrongAnswerBook) {
      return;
    }

    const wrongWordIds = Array.from(
      new Set(
        quizAnswers
          .filter((quizAnswer) => !quizAnswer.isCorrect)
          .map((quizAnswer) => quizAnswer.wordId),
      ),
    );

    if (wrongWordIds.length === 0) {
      setResultFeedbackMessage("틀린 문제가 없어 새 단어장을 만들 수 없습니다.");
      return;
    }

    setIsCreatingWrongAnswerBook(true);
    setResultFeedbackMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setResultFeedbackMessage(userError?.message ?? "사용자 정보를 확인하지 못했습니다.");
      setIsCreatingWrongAnswerBook(false);
      return;
    }

    const createdDateText = new Date().toLocaleDateString("ko-KR");
    const { data: vocabularyBook, error: vocabularyBookError } = await createVocabularyBookForUser(
      `퀴즈 오답 ${createdDateText}`,
      "전체 단어 퀴즈에서 틀린 단어로 만든 단어장입니다.",
      user.id,
    );

    if (vocabularyBookError) {
      setResultFeedbackMessage(`오답 단어장을 만들지 못했습니다. ${vocabularyBookError.message}`);
      setIsCreatingWrongAnswerBook(false);
      return;
    }

    const { error: vocabularyBookWordsError } = await supabase.from("vocabulary_book_words").insert(
      wrongWordIds.map((wordId) => ({
        book_id: vocabularyBook.id,
        word_id: wordId,
        status: false,
        wrong_count: 1,
      })),
    );

    if (vocabularyBookWordsError) {
      setResultFeedbackMessage(`오답 단어장은 만들었지만 단어를 추가하지 못했습니다. ${vocabularyBookWordsError.message}`);
      addVocabularyBook(vocabularyBook);
      setHasCreatedWrongAnswerBook(true);
      setIsCreatingWrongAnswerBook(false);
      return;
    }

    addVocabularyBook(vocabularyBook);
    await loadVocabularyBooksForUser(user.id, true);
    setHasCreatedWrongAnswerBook(true);
    setIsCreatingWrongAnswerBook(false);
    router.replace("/");
  };

  // 퀴즈 흐름을 초기화하고 설정 씬으로 돌아갑니다.
  const handleResetQuiz = () => {
    setQuizQuestions([]);
    setQuizAnswers([]);
    setErrorMessage("");
    setResultFeedbackMessage("");
    setHasCreatedWrongAnswerBook(false);
    setHasSavedQuizResult(false);
    setIsCreatingWrongAnswerBook(false);
    setCurrentScene("setup");
  };

  return (
    <main className={sharedStyles.contentPage}>
      <AppHeader />
      <section className={sharedStyles.contentShell} aria-labelledby="quiz-title">
        <div className={sharedStyles.heroSection}>
          <p className={sharedStyles.eyebrowText}>Quiz practice</p>
          <h1 id="quiz-title" className={sharedStyles.pageTitle}>
            퀴즈 학습
          </h1>
          <p className={sharedStyles.pageDescription}>
            단어장과 JLPT 범위를 선택해 문제를 풀고 결과를 바탕으로 복습할 단어를 정리합니다.
          </p>
        </div>

        <div className={styles.sceneShell}>
          {errorMessage ? (
            <p className={styles.errorNotice} role="alert">
              {errorMessage}
            </p>
          ) : null}

          {currentScene === "setup" ? (
            <QuizSetupScene
              initialQuizSetup={quizSetup}
              isPreparingQuiz={isPreparingQuiz}
              onStartQuiz={handleStartQuiz}
              vocabularyBooks={vocabularyBooks}
            />
          ) : null}

          {currentScene === "question" ? (
            <QuizQuestionScene
              quizAnswers={quizAnswers}
              quizQuestions={quizQuestions}
              selectedVocabularyBookTitle={selectedVocabularyBookTitle}
              onFinishQuiz={handleFinishQuiz}
              onSubmitAnswer={handleSubmitAnswer}
            />
          ) : null}

          {currentScene === "result" ? (
            <QuizResultScene
              hasCreatedWrongAnswerBook={hasCreatedWrongAnswerBook}
              hasSavedQuizResult={hasSavedQuizResult}
              isCreatingWrongAnswerBook={isCreatingWrongAnswerBook}
              isSavingQuizResult={isSavingQuizResult}
              quizAnswers={quizAnswers}
              quizSetup={quizSetup}
              resultFeedbackMessage={resultFeedbackMessage}
              onApplyQuizResult={handleApplyQuizResult}
              onCreateWrongAnswerBook={handleCreateWrongAnswerBook}
              onResetQuiz={handleResetQuiz}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
