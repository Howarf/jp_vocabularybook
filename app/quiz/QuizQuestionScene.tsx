"use client";

import { useMemo, useState } from "react";
import sharedStyles from "../shared.module.css";
import type { QuizAnswer, QuizQuestion } from "./QuizClient";
import styles from "./quiz.module.css";

type QuizQuestionSceneProps = {
  quizAnswers: QuizAnswer[];
  quizQuestions: QuizQuestion[];
  selectedVocabularyBookTitle: string | null;
  onFinishQuiz: () => void;
  onSubmitAnswer: (quizQuestion: QuizQuestion, selectedAnswer: string) => void;
};

// 객관식 문제 풀이 화면과 답안 선택 흐름을 렌더링합니다.
export default function QuizQuestionScene({
  quizAnswers,
  quizQuestions,
  selectedVocabularyBookTitle,
  onFinishQuiz,
  onSubmitAnswer,
}: QuizQuestionSceneProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const currentQuestion = quizQuestions[currentQuestionIndex] ?? null;
  const isLastQuestion = currentQuestionIndex >= quizQuestions.length - 1;
  const hasSelectedAnswer = selectedAnswer !== null;
  const isSelectedAnswerCorrect = selectedAnswer === currentQuestion?.correctAnswer;

  const progressPercentage = useMemo(() => {
    if (quizQuestions.length === 0) {
      return 0;
    }

    return Math.round(((currentQuestionIndex + 1) / quizQuestions.length) * 100);
  }, [currentQuestionIndex, quizQuestions.length]);

  // 사용자가 선택한 답안을 현재 문제 상태에 반영합니다.
  const handleChoiceClick = (choice: string) => {
    if (!currentQuestion || hasSelectedAnswer) {
      return;
    }

    setSelectedAnswer(choice);
    onSubmitAnswer(currentQuestion, choice);
  };

  // 다음 문제로 이동하거나 마지막 문제에서는 결과 씬으로 이동합니다.
  const handleNextQuestion = () => {
    if (!hasSelectedAnswer) {
      return;
    }

    if (isLastQuestion) {
      onFinishQuiz();
      return;
    }

    setCurrentQuestionIndex((previousQuestionIndex) => previousQuestionIndex + 1);
    setSelectedAnswer(null);
  };

  return (
    <section className={[sharedStyles.surfacePanel, styles.scenePanel].join(" ")} aria-labelledby="quiz-question-title">
      <div className={styles.sceneHeader}>
        <h2 id="quiz-question-title" className={sharedStyles.sectionTitle}>
          메인 문제
        </h2>
        <span className={sharedStyles.countBadge}>
          {Math.min(currentQuestionIndex + 1, Math.max(quizQuestions.length, 1))} / {Math.max(quizQuestions.length, 1)}
        </span>
      </div>

      {selectedVocabularyBookTitle ? (
        <p className={styles.sourceText}>{selectedVocabularyBookTitle}</p>
      ) : null}

      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressBar} style={{ width: `${progressPercentage}%` }} />
      </div>

      {currentQuestion ? (
        <div className={styles.questionLayout}>
          <div className={styles.questionCard}>
            <p className={styles.questionMode}>
              {currentQuestion.mode === "wordToMeaning" ? "일본어 보고 뜻 맞히기" : "뜻 보고 일본어 맞히기"}
            </p>
            <strong className={styles.questionText}>{currentQuestion.questionText}</strong>
            {currentQuestion.mode === "wordToMeaning" && currentQuestion.reading ? (
              <span className={styles.questionReading}>{currentQuestion.reading}</span>
            ) : null}
          </div>

          <div className={styles.choiceGrid}>
            {currentQuestion.choices.map((choice) => {
              const isSelectedChoice = selectedAnswer === choice;
              const isCorrectChoice = currentQuestion.correctAnswer === choice;
              const shouldShowCorrectChoice = hasSelectedAnswer && isCorrectChoice;
              const shouldShowWrongChoice = hasSelectedAnswer && isSelectedChoice && !isCorrectChoice;

              return (
                <button
                  className={[
                    styles.choiceButton,
                    shouldShowCorrectChoice ? styles.correctChoiceButton : "",
                    shouldShowWrongChoice ? styles.wrongChoiceButton : "",
                  ].join(" ")}
                  disabled={hasSelectedAnswer}
                  key={choice}
                  type="button"
                  onClick={() => handleChoiceClick(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          {hasSelectedAnswer ? (
            <p className={isSelectedAnswerCorrect ? styles.correctFeedback : styles.wrongFeedback} role="status">
              {isSelectedAnswerCorrect ? "정답입니다." : `오답입니다. 정답은 ${currentQuestion.correctAnswer}입니다.`}
            </p>
          ) : null}

          <button
            className={[styles.primaryActionButton, styles.quizFlowActionButton].join(" ")}
            disabled={!hasSelectedAnswer}
            type="button"
            onClick={handleNextQuestion}
          >
            {isLastQuestion ? "결과 보기" : "다음 문제"}
          </button>
        </div>
      ) : (
        <p className={styles.emptyText}>출제된 문제가 없습니다.</p>
      )}

      <span className={styles.answerCountText}>답변 완료 {quizAnswers.length}개</span>
    </section>
  );
}
