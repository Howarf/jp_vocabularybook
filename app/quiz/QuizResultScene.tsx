"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import sharedStyles from "../shared.module.css";
import type { ApplyQuizResultResult, QuizAnswer, QuizResultApplyMode, QuizSetup } from "./QuizClient";
import styles from "./quiz.module.css";

type QuizResultSceneProps = {
  hasSavedQuizResult: boolean;
  hasCreatedWrongAnswerBook: boolean;
  isCreatingWrongAnswerBook: boolean;
  isSavingQuizResult: boolean;
  quizAnswers: QuizAnswer[];
  quizSetup: QuizSetup;
  resultFeedbackMessage: string;
  onApplyQuizResult: (resultApplyMode: QuizResultApplyMode) => Promise<ApplyQuizResultResult>;
  onCreateWrongAnswerBook: () => Promise<void>;
  onResetQuiz: () => void;
};

// 퀴즈 결과 요약과 결과 반영 흐름을 렌더링합니다.
export default function QuizResultScene({
  hasSavedQuizResult,
  hasCreatedWrongAnswerBook,
  isCreatingWrongAnswerBook,
  isSavingQuizResult,
  quizAnswers,
  quizSetup,
  resultFeedbackMessage,
  onApplyQuizResult,
  onCreateWrongAnswerBook,
  onResetQuiz,
}: QuizResultSceneProps) {
  const [resultApplyMode, setResultApplyMode] = useState<QuizResultApplyMode>("saveCountsOnly");
  const [isApplyModeModalOpen, setIsApplyModeModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const correctAnswerCount = quizAnswers.filter((quizAnswer) => quizAnswer.isCorrect).length;
  const wrongAnswers = quizAnswers.filter((quizAnswer) => !quizAnswer.isCorrect);
  const accuracyRate = quizAnswers.length > 0 ? Math.round((correctAnswerCount / quizAnswers.length) * 100) : 0;
  const canSaveQuizResult = quizSetup.sourceType === "vocabularyBook";
  const canCreateWrongAnswerBook =
    quizSetup.sourceType === "allWords" && wrongAnswers.length > 0 && !hasCreatedWrongAnswerBook;

  // 결과 반영 방식 선택값을 현재 상태에 저장합니다.
  const handleResultApplyModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setResultApplyMode(event.target.value as QuizResultApplyMode);
  };

  // 결과 반영 방식 선택 모달을 엽니다.
  const handleOpenApplyModeModal = () => {
    if (!canSaveQuizResult || hasSavedQuizResult) {
      return;
    }

    setIsApplyModeModalOpen(true);
  };

  // 결과 반영 방식 선택 모달을 닫습니다.
  const handleCloseApplyModeModal = () => {
    if (isSavingQuizResult) {
      return;
    }

    setIsApplyModeModalOpen(false);
  };

  // 현재 선택한 결과 반영 방식으로 저장 요청을 전달합니다.
  const handleApplyQuizResult = async () => {
    const applyQuizResult = await onApplyQuizResult(resultApplyMode);

    if (!applyQuizResult.didSaveQuizResult) {
      return;
    }

    setIsApplyModeModalOpen(false);

    if (applyQuizResult.shouldOpenCompletionModal) {
      setIsCompletionModalOpen(true);
    }
  };

  // 저장 완료 모달에서 퀴즈 설정 화면으로 돌아갑니다.
  const handleResetQuizFromCompletionModal = () => {
    setIsCompletionModalOpen(false);
    onResetQuiz();
  };

  return (
    <section className={[sharedStyles.surfacePanel, styles.scenePanel].join(" ")} aria-labelledby="quiz-result-title">
      <div className={styles.sceneHeader}>
        <h2 id="quiz-result-title" className={sharedStyles.sectionTitle}>
          결과
        </h2>
        <span className={sharedStyles.countBadge}>{quizAnswers.length}문제 풀이</span>
      </div>

      <div className={styles.resultSummaryGrid}>
        <div className={styles.resultMetric}>
          <span>정답률</span>
          <strong>{accuracyRate}%</strong>
        </div>
        <div className={styles.resultMetric}>
          <span>정답 수</span>
          <strong>
            {quizAnswers.length}문제 중 {correctAnswerCount}개
          </strong>
        </div>
      </div>

      {!canSaveQuizResult ? (
        <p className={styles.fieldHelpText}>
          전체 단어 퀴즈는 결과 저장 대신 틀린 문제를 새 단어장으로 정리할 수 있습니다.
        </p>
      ) : null}

      {resultFeedbackMessage ? (
        <p className={styles.resultFeedbackMessage} role="status">
          {resultFeedbackMessage}
        </p>
      ) : null}

      <details className={styles.wrongAnswerDropdown} open={wrongAnswers.length > 0}>
        <summary className={styles.wrongAnswerSummary}>틀린 단어 {wrongAnswers.length}개</summary>
        {wrongAnswers.length > 0 ? (
          <ul className={styles.wrongAnswerList}>
            {wrongAnswers.map((wrongAnswer, wrongAnswerIndex) => (
              <li className={styles.wrongAnswerItem} key={`${wrongAnswer.wordId}-${wrongAnswerIndex}`}>
                <span>
                  {wrongAnswer.expression} · 선택: {wrongAnswer.selectedAnswer}
                </span>
                <strong>정답: {wrongAnswer.correctAnswer}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyText}>틀린 단어가 없습니다.</p>
        )}
      </details>

      <div className={styles.resultButtonRow}>
        {canSaveQuizResult ? (
          <button
            className={[styles.primaryActionButton, styles.quizFlowActionButton].join(" ")}
            disabled={isSavingQuizResult || hasSavedQuizResult}
            onClick={handleOpenApplyModeModal}
          >
            {hasSavedQuizResult ? "결과 저장 완료" : "결과 저장 및 반영"}
          </button>
        ) : (
          <button
            className={[styles.primaryActionButton, styles.quizFlowActionButton].join(" ")}
            disabled={!canCreateWrongAnswerBook || isCreatingWrongAnswerBook}
            onClick={onCreateWrongAnswerBook}
          >
            {hasCreatedWrongAnswerBook
              ? "단어장 생성 완료"
              : isCreatingWrongAnswerBook
                ? "단어장 만드는 중"
                : "틀린 문제로 단어장 만들기"}
          </button>
        )}
      </div>

      {isApplyModeModalOpen ? (
        <div className={styles.quizModalBackdrop} role="presentation">
          <section
            aria-labelledby="quiz-apply-mode-modal-title"
            aria-modal="true"
            className={styles.quizModalCard}
            role="dialog"
          >
            <div className={styles.quizModalHeader}>
              <h3 id="quiz-apply-mode-modal-title" className={styles.quizModalTitle}>
                결과 반영 방식을 선택해 주세요
              </h3>
            </div>

            <label className={styles.formLabel} htmlFor="quiz-result-apply-mode">
              반영 방식
              <select
                id="quiz-result-apply-mode"
                className={styles.formSelect}
                disabled={isSavingQuizResult}
                value={resultApplyMode}
                onChange={handleResultApplyModeChange}
              >
                <option value="saveCountsOnly">정답/오답 횟수만 저장</option>
                <option value="markCorrectAsLearned">맞힌 단어를 학습완료로 변경</option>
                <option value="markCorrectAsLearnedAndWrongAsLearning">
                  맞힌 단어는 학습완료, 틀린 단어는 학습중으로 변경
                </option>
              </select>
            </label>

            <div className={styles.quizModalButtonRow}>
              <button
                className={styles.secondaryActionButton}
                disabled={isSavingQuizResult}
                onClick={handleCloseApplyModeModal}
              >
                취소
              </button>
              <button
                className={styles.primaryActionButton}
                disabled={isSavingQuizResult}
                onClick={handleApplyQuizResult}
              >
                {isSavingQuizResult ? "저장 중" : "저장하기"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isCompletionModalOpen ? (
        <div className={styles.quizModalBackdrop} role="presentation">
          <section
            aria-labelledby="quiz-completion-modal-title"
            aria-modal="true"
            className={styles.quizModalCard}
            role="dialog"
          >
            <div className={styles.quizModalHeader}>
              <h3 id="quiz-completion-modal-title" className={styles.quizModalTitle}>
                결과 저장이 완료되었습니다
              </h3>
            </div>
            <div className={styles.quizModalButtonRow}>
              <button className={styles.secondaryActionButton} onClick={handleResetQuizFromCompletionModal}>
                퀴즈 다시 하기
              </button>
              <Link className={styles.primaryActionLink} href="/">
                메인으로 가기
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
