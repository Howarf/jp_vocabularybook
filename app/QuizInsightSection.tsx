"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { QuizResultRow } from "@/src/types/vocabulary";
import sharedStyles from "./shared.module.css";
import styles from "./page.module.css";

type RecentQuizResult = Pick<
  QuizResultRow,
  | "id"
  | "vocabulary_book_id"
  | "total_questions"
  | "correct_count"
  | "wrong_count"
  | "accuracy"
  | "wrong_word_ids"
  | "created_at"
>;

// 숫자를 정수 퍼센트 문자열로 변환합니다.
function formatAccuracyPercentage(accuracy: number) {
  return `${Math.round(accuracy)}%`;
}

// 최근 퀴즈 결과에서 정답 수와 전체 문제 수 문구를 만듭니다.
function formatCorrectAnswerText(recentQuizResult: RecentQuizResult | null) {
  if (!recentQuizResult) {
    return "아직 퀴즈 결과가 없습니다.";
  }

  return `${recentQuizResult.total_questions}문제 중 ${recentQuizResult.correct_count}개 정답`;
}

// 최근 퀴즈 결과에 연결된 틀린 단어 수를 계산합니다.
function getRecentWrongWordCount(recentQuizResult: RecentQuizResult | null) {
  if (!recentQuizResult) {
    return 0;
  }

  return recentQuizResult.wrong_word_ids.length || recentQuizResult.wrong_count;
}

// 메인 페이지에서 최근 퀴즈의 틀린 단어 수와 퀴즈 결과를 함께 보여줍니다.
export default function QuizInsightSection() {
  const [recentQuizResult, setRecentQuizResult] = useState<RecentQuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 현재 사용자의 가장 최근 퀴즈 결과를 불러옵니다.
    const loadRecentQuizResult = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setRecentQuizResult(null);
          return;
        }

        const { data, error } = await supabase
          .from("quiz_results")
          .select("id,vocabulary_book_id,total_questions,correct_count,wrong_count,accuracy,wrong_word_ids,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setRecentQuizResult(data as RecentQuizResult | null);
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          unknownError instanceof Error
            ? unknownError.message
            : "퀴즈 요약 정보를 불러오지 못했습니다.",
        );
        setRecentQuizResult(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRecentQuizResult();

    return () => {
      isMounted = false;
    };
  }, []);

  const recentWrongWordCount = getRecentWrongWordCount(recentQuizResult);
  const hasWrongQuizQuestions = recentWrongWordCount > 0;

  // 틀린 단어 카드 클릭 시 복습 확인 모달을 엽니다.
  const handleOpenReviewModal = () => {
    if (!hasWrongQuizQuestions) {
      return;
    }

    setIsReviewModalOpen(true);
  };

  // 틀린 단어 복습 확인 모달을 닫습니다.
  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
  };

  return (
    <section
      className={[sharedStyles.surfacePanel, styles.panel, styles.quizInsightPanel].join(" ")}
      aria-labelledby="quiz-insight-title"
    >
      <div className={styles.listHeader}>
        <h2 id="quiz-insight-title" className={sharedStyles.sectionTitle}>
          퀴즈 복습 요약
        </h2>
        <span className={sharedStyles.countBadge}>최근 결과</span>
      </div>

      {isLoading ? <div className={styles.todayWordState}>퀴즈 요약 정보를 불러오는 중입니다...</div> : null}

      {!isLoading && errorMessage ? (
        <div className={styles.todayWordState} role="alert">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className={styles.quizInsightGrid}>
          <button
            className={[styles.quizInsightCard, styles.quizWrongWordCard].join(" ")}
            disabled={!hasWrongQuizQuestions}
            onClick={handleOpenReviewModal}
            type="button"
          >
            <span>최근 퀴즈 틀린 단어</span>
            <strong>{recentWrongWordCount}개</strong>
            <p>가장 최근 퀴즈에서 틀린 단어 수입니다.</p>
          </button>

          <article className={styles.quizInsightCard}>
            <span>최근 퀴즈 결과</span>
            <strong>{formatAccuracyPercentage(recentQuizResult?.accuracy ?? 0)}</strong>
            <p>{formatCorrectAnswerText(recentQuizResult)}</p>
          </article>
        </div>
      ) : null}

      {isReviewModalOpen && recentQuizResult ? (
        <div className={[sharedStyles.modalBackdrop, styles.quizReviewModalBackdrop].join(" ")} role="presentation">
          <section
            aria-labelledby="quiz-review-modal-title"
            aria-modal="true"
            className={styles.quizReviewModalCard}
            role="dialog"
          >
            <div>
              <p className={styles.quizReviewModalEyebrow}>Wrong answer review</p>
              <h3 id="quiz-review-modal-title" className={styles.quizReviewModalTitle}>
                틀린 문제를 다시 풀까요?
              </h3>
            </div>
            <p className={styles.quizReviewModalDescription}>
              최근 퀴즈에서 틀린 단어 {recentWrongWordCount}개를 다시 확인합니다.
            </p>
            <div className={styles.quizReviewModalActions}>
              <button className={styles.quizReviewCancelButton} onClick={handleCloseReviewModal} type="button">
                취소
              </button>
              <Link
                className={styles.quizReviewConfirmLink}
                href={`/quiz?bookId=${recentQuizResult.vocabulary_book_id}`}
              >
                다시 풀기
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
