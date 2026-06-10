"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { VocabularyBookWithLearningRows } from "@/src/types/vocabulary";
import sharedStyles from "./shared.module.css";
import styles from "./page.module.css";

type LearningVocabularyBook = {
  id: string;
  title: string;
  description: string | null;
  wordCount: number;
  learnedWordCount: number;
  learningProgressPercentage: number;
};

// 단어 수와 외운 단어 수를 기준으로 단어장 진행률을 계산합니다.
function calculateLearningProgressPercentage(wordCount: number, learnedWordCount: number) {
  if (wordCount === 0) {
    return 0;
  }

  return Math.round((learnedWordCount / wordCount) * 100);
}

// Supabase 단어장 조회 결과를 메인 화면 카드 데이터로 변환합니다.
function createLearningVocabularyBook(vocabularyBook: VocabularyBookWithLearningRows): LearningVocabularyBook {
  const vocabularyBookWords = vocabularyBook.vocabulary_book_words ?? [];
  const wordCount = vocabularyBookWords.length;
  const learnedWordCount = vocabularyBookWords.filter(
    (vocabularyBookWord) => vocabularyBookWord.status === true,
  ).length;

  return {
    id: vocabularyBook.id,
    title: vocabularyBook.title,
    description: vocabularyBook.description,
    wordCount,
    learnedWordCount,
    learningProgressPercentage: calculateLearningProgressPercentage(wordCount, learnedWordCount),
  };
}

// 메인 페이지에서 학습중인 단어장 목록과 진행도를 보여줍니다.
export default function LearningVocabularyBookSection() {
  const [learningVocabularyBooks, setLearningVocabularyBooks] = useState<LearningVocabularyBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    // 현재 사용자의 단어장 목록과 각 단어장의 학습 진행 데이터를 불러옵니다.
    const loadLearningVocabularyBooks = async () => {
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
          setLearningVocabularyBooks([]);
          return;
        }

        const { data, error } = await supabase
          .from("vocabulary_books")
          .select("id,user_id,title,description,created_at,updated_at,vocabulary_book_words(status)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setLearningVocabularyBooks(
          ((data ?? []) as VocabularyBookWithLearningRows[]).map(createLearningVocabularyBook),
        );
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          unknownError instanceof Error
            ? unknownError.message
            : "학습중인 단어장을 불러오지 못했습니다.",
        );
        setLearningVocabularyBooks([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLearningVocabularyBooks();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasLearningVocabularyBooks = learningVocabularyBooks.length > 0;
  const hasTallList = learningVocabularyBooks.length >= 5;
  const hasScrollableList = learningVocabularyBooks.length > 10;

  return (
    <section
      className={[sharedStyles.surfacePanel, styles.panel, styles.learningVocabularyBookPanel].join(" ")}
      aria-labelledby="learning-vocabulary-book-title"
    >
      <div className={styles.listHeader}>
        <h2 id="learning-vocabulary-book-title" className={sharedStyles.sectionTitle}>
          학습중인 단어장
        </h2>
        <span className={sharedStyles.countBadge}>{learningVocabularyBooks.length}개</span>
      </div>

      {isLoading ? <div className={styles.todayWordState}>학습중인 단어장을 불러오는 중입니다...</div> : null}

      {!isLoading && errorMessage ? (
        <div className={styles.todayWordState} role="alert">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && !hasLearningVocabularyBooks ? (
        <div className={styles.emptyLearningVocabularyBookState}>
          <Link className={styles.createVocabularyBookButton} href="/notebooks">
            단어장 만들기
          </Link>
        </div>
      ) : null}

      {!isLoading && !errorMessage && hasLearningVocabularyBooks ? (
        <ul
          className={[sharedStyles.responsiveList, styles.learningVocabularyBookList].join(" ")}
          data-has-scroll={hasScrollableList ? "true" : "false"}
          data-tall={hasTallList ? "true" : "false"}
        >
          {learningVocabularyBooks.map((learningVocabularyBook) => (
            <li className={styles.learningVocabularyBookItem} key={learningVocabularyBook.id}>
              <div className={styles.learningVocabularyBookCard}>
                <Link
                  className={styles.learningVocabularyBookLink}
                  href={`/notebooks?bookId=${learningVocabularyBook.id}`}
                >
                  <div className={styles.cardTitleRow}>
                    <strong>{learningVocabularyBook.title}</strong>
                    <small>{learningVocabularyBook.learningProgressPercentage}%</small>
                  </div>
                  <span>
                    {learningVocabularyBook.description ?? "설명 없는 단어장입니다."}
                  </span>
                  <div className={styles.learningVocabularyBookMetaRow}>
                    <span>
                      {learningVocabularyBook.learnedWordCount} / {learningVocabularyBook.wordCount}개 학습
                    </span>
                    <span>{learningVocabularyBook.wordCount - learningVocabularyBook.learnedWordCount}개 남음</span>
                  </div>
                  <div className={styles.progressTrack} aria-hidden="true">
                    <div
                      className={styles.progressBar}
                      style={{ width: `${learningVocabularyBook.learningProgressPercentage}%` }}
                    />
                  </div>
                </Link>
                <button aria-disabled="true" className={styles.mockQuizButton} type="button">
                  퀴즈
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
