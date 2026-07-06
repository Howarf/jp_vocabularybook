"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { VocabularyBookWithCount } from "@/src/types/vocabulary";
import sharedStyles from "../shared.module.css";
import type { QuizLevel, QuizQuestionMode, QuizSetup, QuizSourceType } from "./QuizClient";
import styles from "./quiz.module.css";

type QuizSetupSceneProps = {
  initialQuizSetup: QuizSetup;
  isPreparingQuiz: boolean;
  vocabularyBooks: VocabularyBookWithCount[];
  onStartQuiz: (quizSetup: QuizSetup) => void;
};

const questionCountOptions = [10, 20, 30];
const quizLevelOptions: QuizLevel[] = ["N5", "N4", "N3"];

// 퀴즈 시작 전 출제 대상과 문제 조건을 설정합니다.
export default function QuizSetupScene({
  initialQuizSetup,
  isPreparingQuiz,
  vocabularyBooks,
  onStartQuiz,
}: QuizSetupSceneProps) {
  const firstVocabularyBookId = vocabularyBooks[0]?.id ?? null;
  const [sourceType, setSourceType] = useState<QuizSourceType>(initialQuizSetup.sourceType);
  const [vocabularyBookId, setVocabularyBookId] = useState<string | null>(
    initialQuizSetup.vocabularyBookId ?? firstVocabularyBookId,
  );
  const [level, setLevel] = useState<QuizLevel>(initialQuizSetup.level);
  const [questionCount, setQuestionCount] = useState(initialQuizSetup.questionCount);
  const [questionMode, setQuestionMode] = useState<QuizQuestionMode>(initialQuizSetup.questionMode);

  const hasVocabularyBooks = vocabularyBooks.length > 0;
  const isVocabularyBookSourceDisabled = sourceType === "vocabularyBook" && !hasVocabularyBooks;
  const hasSelectedVocabularyBook = vocabularyBooks.some((vocabularyBook) => vocabularyBook.id === vocabularyBookId);
  const effectiveVocabularyBookId = hasSelectedVocabularyBook ? vocabularyBookId : firstVocabularyBookId;

  const selectedVocabularyBook = useMemo(
    () => vocabularyBooks.find((vocabularyBook) => vocabularyBook.id === effectiveVocabularyBookId) ?? null,
    [effectiveVocabularyBookId, vocabularyBooks],
  );

  // 출제 대상 선택값을 현재 설정에 반영합니다.
  const handleSourceTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextSourceType = event.target.value as QuizSourceType;
    setSourceType(nextSourceType);

    if (nextSourceType === "vocabularyBook" && !vocabularyBookId) {
      setVocabularyBookId(firstVocabularyBookId);
    }
  };

  // 선택한 단어장 id를 현재 설정에 반영합니다.
  const handleVocabularyBookChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setVocabularyBookId(event.target.value || null);
  };

  // JLPT 레벨 선택값을 현재 설정에 반영합니다.
  const handleLevelChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLevel(event.target.value as QuizLevel);
  };

  // 문제 수 선택값을 현재 설정에 반영합니다.
  const handleQuestionCountChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setQuestionCount(Number(event.target.value));
  };

  // 문제 방식 선택값을 현재 설정에 반영합니다.
  const handleQuestionModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setQuestionMode(event.target.value as QuizQuestionMode);
  };

  // 설정 폼을 제출해 퀴즈 시작 요청을 전달합니다.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onStartQuiz({
      sourceType,
      vocabularyBookId: sourceType === "vocabularyBook" ? effectiveVocabularyBookId : null,
      level,
      questionCount,
      questionMode,
    });
  };

  return (
    <section className={[sharedStyles.surfacePanel, styles.scenePanel].join(" ")} aria-labelledby="quiz-setup-title">
      <div className={styles.sceneHeader}>
        <h2 id="quiz-setup-title" className={sharedStyles.sectionTitle}>
          설정 및 시작
        </h2>
      </div>

      <form className={styles.setupForm} onSubmit={handleSubmit}>
        <fieldset className={styles.fieldGroup}>
          <legend className={styles.fieldLegend}>출제 대상</legend>
          <label className={styles.radioCard}>
            <input
              checked={sourceType === "vocabularyBook"}
              name="quiz-source-type"
              type="radio"
              value="vocabularyBook"
              onChange={handleSourceTypeChange}
            />
            <span>
              <strong>내 단어장</strong>
              학습완료가 아닌 단어를 중심으로 출제합니다.
            </span>
          </label>
          <label className={styles.radioCard}>
            <input
              checked={sourceType === "allWords"}
              name="quiz-source-type"
              type="radio"
              value="allWords"
              onChange={handleSourceTypeChange}
            />
            <span>
              <strong>전체 단어</strong>
              JLPT 범위를 선택해 무작위로 출제합니다.
            </span>
          </label>
        </fieldset>

        {sourceType === "vocabularyBook" ? (
          <label className={styles.formLabel} htmlFor="quiz-vocabulary-book">
            단어장
            <select
              id="quiz-vocabulary-book"
              className={styles.formSelect}
              disabled={!hasVocabularyBooks}
              value={effectiveVocabularyBookId ?? ""}
              onChange={handleVocabularyBookChange}
            >
              {!hasVocabularyBooks ? <option value="">단어장이 없습니다</option> : null}
              {vocabularyBooks.map((vocabularyBook) => (
                <option key={vocabularyBook.id} value={vocabularyBook.id}>
                  {vocabularyBook.title} · {vocabularyBook.wordCount - vocabularyBook.learnedWordCount}개 남음
                </option>
              ))}
            </select>
            {selectedVocabularyBook ? (
              <span className={styles.fieldHelpText}>
                {selectedVocabularyBook.learnedWordCount} / {selectedVocabularyBook.wordCount}개 학습완료
              </span>
            ) : null}
          </label>
        ) : null}

        <div className={styles.formGrid}>
          <label className={styles.formLabel} htmlFor="quiz-level">
            JLPT 범위
            <select
              id="quiz-level"
              className={styles.formSelect}
              disabled={sourceType === "vocabularyBook"}
              value={level}
              onChange={handleLevelChange}
            >
              {quizLevelOptions.map((quizLevel) => (
                <option key={quizLevel} value={quizLevel}>
                  {quizLevel}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.formLabel} htmlFor="quiz-question-count">
            문제 수
            <select
              id="quiz-question-count"
              className={styles.formSelect}
              value={questionCount}
              onChange={handleQuestionCountChange}
            >
              {questionCountOptions.map((questionCountOption) => (
                <option key={questionCountOption} value={questionCountOption}>
                  {questionCountOption}문제
                </option>
              ))}
            </select>
          </label>

          <label className={styles.formLabel} htmlFor="quiz-question-mode">
            문제 방식
            <select
              id="quiz-question-mode"
              className={styles.formSelect}
              value={questionMode}
              onChange={handleQuestionModeChange}
            >
              <option value="random">무작위</option>
              <option value="wordToMeaning">일본어 보고 뜻 맞히기</option>
              <option value="meaningToWord">뜻 보고 일본어 맞히기</option>
            </select>
          </label>
        </div>

        <button
          className={styles.primaryActionButton}
          disabled={isPreparingQuiz || isVocabularyBookSourceDisabled}
          type="submit"
        >
          {isPreparingQuiz ? "문제 준비 중" : "시작하기"}
        </button>
      </form>
    </section>
  );
}
