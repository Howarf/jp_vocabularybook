import type { VocabularyBookWordWithWord, WordPartOfSpeech, WordRow } from "@/src/types/vocabulary";
import { normalizeJoinedWord } from "@/src/utils/word";
import type { QuizQuestion, QuizQuestionMode, QuizResolvedQuestionMode } from "./quizTypes";

export type QuizCandidate = {
  wordId: number;
  vocabularyBookWordId: string | null;
  expression: string;
  reading: string | null;
  meaningKo: string;
  tag: string | null;
  partOfSpeech: WordPartOfSpeech | null;
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
export function createCandidateFromVocabularyBookWord(vocabularyBookWord: VocabularyBookWordWithWord): QuizCandidate | null {
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
export function createCandidateFromWord(word: WordRow): QuizCandidate {
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

// 퀴즈 후보 목록과 전체 선택지 후보에서 설정한 개수만큼 문제를 생성합니다.
export function createQuizQuestions(
  candidates: QuizCandidate[],
  choiceCandidates: QuizCandidate[],
  questionMode: QuizQuestionMode,
  questionCount: number,
) {
  return shuffleItems(candidates)
    .map((candidate) => createQuizQuestion(candidate, choiceCandidates, questionMode))
    .filter((quizQuestion) => quizQuestion.choices.length === 4)
    .slice(0, questionCount);
}
