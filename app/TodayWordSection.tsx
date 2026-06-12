"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";
import type { WordRow } from "@/src/types/vocabulary";
import {
  normalizeJoinedWord,
  pickWordDisplayValue,
  wordExpressionFields,
  wordKoreanMeaningFields,
  wordReadingFields,
  wordTagFields,
} from "@/src/utils/word";
import sharedStyles from "./shared.module.css";
import styles from "./page.module.css";

type SavedWordRecommendation = {
  id: string;
  status: boolean | null;
  wrong_count: number | null;
  words: WordRow | WordRow[] | null;
};

type TodayWordCard = {
  id: string;
  expression: string;
  reading: string;
  meaning: string;
  tag: string;
};

const fallbackTagValues = ["JLPT_N5", "JLPT_N4", "JLPT_N3"];
const todayWordLimit = 8;

// 전달받은 항목 배열을 무작위 순서로 섞습니다.
function shuffleWords<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

// 전체 단어 행을 오늘의 단어 카드 데이터로 변환합니다.
function createFallbackCard(word: WordRow): TodayWordCard {
  return {
    id: `fallback-${word.id}`,
    expression: pickWordDisplayValue(word, wordExpressionFields),
    reading: pickWordDisplayValue(word, wordReadingFields),
    meaning: pickWordDisplayValue(word, wordKoreanMeaningFields),
    tag: pickWordDisplayValue(word, wordTagFields),
  };
}

// 저장된 단어 연결 행을 오늘의 단어 카드 데이터로 변환합니다.
function createSavedWordCard(savedWord: SavedWordRecommendation): TodayWordCard | null {
  const word = normalizeJoinedWord(savedWord.words);

  if (!word) {
    return null;
  }

  return {
    id: savedWord.id,
    expression: pickWordDisplayValue(word, wordExpressionFields),
    reading: pickWordDisplayValue(word, wordReadingFields),
    meaning: pickWordDisplayValue(word, wordKoreanMeaningFields),
    tag: pickWordDisplayValue(word, wordTagFields),
  };
}

// 메인 페이지에서 오늘 추천할 단어 카드 묶음을 보여줍니다.
export default function TodayWordSection() {
  const [todayWords, setTodayWords] = useState<TodayWordCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasVocabularyBooks, setHasVocabularyBooks] = useState(false);
  const [isCardExiting, setIsCardExiting] = useState(false);
  const [isResetPromptVisible, setIsResetPromptVisible] = useState(false);
  const vocabularyBooks = useVocabularyBookStore((state) => state.vocabularyBooks);
  const loadedUserId = useVocabularyBookStore((state) => state.loadedUserId);
  const cardExitTimerRef = useRef<number | null>(null);
  const activeWord = todayWords[activeIndex] ?? null;

  // 단어장이 없거나 추천 단어가 없을 때 사용할 기본 단어를 불러옵니다.
  const loadFallbackWords = useCallback(async () => {
    const { data, error } = await supabase
      .from("words")
      .select("id,expression,reading,meaning_ko,meaning_en,tag")
      .in("tag", fallbackTagValues)
      .limit(80);

    if (error) {
      throw error;
    }

    return shuffleWords(data ?? [])
      .slice(0, todayWordLimit)
      .map(createFallbackCard);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 현재 사용자의 단어장 여부에 따라 오늘의 단어 후보를 불러옵니다.
    const loadTodayWords = async () => {
      if (!loadedUserId) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        let nextHasVocabularyBooks = false;
        let nextWords: TodayWordCard[] = [];
        const userVocabularyBookIds = vocabularyBooks.map((vocabularyBook) => vocabularyBook.id);
        nextHasVocabularyBooks = userVocabularyBookIds.length > 0;

        if (!nextHasVocabularyBooks) {
          nextWords = await loadFallbackWords();
        } else {
          const { data: savedWords, error: savedWordsError } = await supabase
            .from("vocabulary_book_words")
            .select("id,status,wrong_count,created_at,words(id,expression,reading,meaning_ko,meaning_en,tag)")
            .in("book_id", userVocabularyBookIds)
            .order("status", { ascending: true })
            .order("wrong_count", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(todayWordLimit);

          if (savedWordsError) {
            throw savedWordsError;
          }

          nextWords = ((savedWords ?? []) as SavedWordRecommendation[])
            .map(createSavedWordCard)
            .filter((word): word is TodayWordCard => Boolean(word));

          if (nextWords.length === 0) {
            nextWords = await loadFallbackWords();
          }
        }

        if (!isMounted) {
          return;
        }

        setHasVocabularyBooks(nextHasVocabularyBooks);
        setTodayWords(nextWords);
        setActiveIndex(0);
        setIsResetPromptVisible(false);
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          unknownError instanceof Error
            ? unknownError.message
            : "오늘의 단어를 불러오지 못했습니다.",
        );
        setTodayWords([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTodayWords();

    return () => {
      isMounted = false;
    };
  }, [loadFallbackWords, loadedUserId, vocabularyBooks]);

  useEffect(() => () => {
    if (cardExitTimerRef.current) {
      window.clearTimeout(cardExitTimerRef.current);
    }
  }, []);

  const handleActiveCardClick = () => {
    if (isCardExiting) {
      return;
    }

    if (activeIndex >= todayWords.length - 1) {
      setIsResetPromptVisible(true);
      return;
    }

    setIsResetPromptVisible(false);
    setIsCardExiting(true);
    cardExitTimerRef.current = window.setTimeout(() => {
      setActiveIndex((currentIndex) => Math.min(currentIndex + 1, todayWords.length - 1));
      setIsCardExiting(false);
      cardExitTimerRef.current = null;
    }, 260);
  };

  const handleResetCards = () => {
    if (cardExitTimerRef.current) {
      window.clearTimeout(cardExitTimerRef.current);
      cardExitTimerRef.current = null;
    }

    setIsCardExiting(false);
    setIsResetPromptVisible(false);
    setActiveIndex(0);
  };

  return (
    <section className={[sharedStyles.surfacePanel, styles.todayWordPanel].join(" ")} aria-labelledby="today-word-title">
      <div className={styles.todayWordHeader}>
        <div className={styles.todayWordTitleRow}>
          <h2 id="today-word-title" className={[sharedStyles.sectionTitle, styles.todayWordTitle].join(" ")}>
            오늘의 단어
          </h2>
          <Link className={styles.moreWordsLink} href="/words">
            단어 더 보기
          </Link>
        </div>
        <p className={styles.todayWordCriteria}>
          {hasVocabularyBooks
            ? "학습 중인 단어와 자주 틀린 단어를 우선 보여줍니다."
            : "사용자의 단어장이 없어 N5-N3 단어를 보여줍니다."}
        </p>
      </div>

      {isLoading ? <div className={styles.todayWordState}>오늘의 단어를 불러오는 중입니다...</div> : null}

      {!isLoading && errorMessage ? (
        <div className={styles.todayWordState} role="alert">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && activeWord ? (
        <>
          <div className={styles.todayWordDeck}>
            <div className={styles.todayWordStack}>
              {todayWords.map((word, index) => (
                <button
                  className={styles.todayWordCard}
                  data-depth={Math.min(Math.max(index - activeIndex, 0), 3)}
                  data-active={index === activeIndex}
                  data-exiting={index === activeIndex && isCardExiting}
                  disabled={index !== activeIndex || isCardExiting || isResetPromptVisible}
                  key={word.id}
                  onClick={handleActiveCardClick}
                  style={{
                    "--today-word-depth": Math.min(Math.max(index - activeIndex, 0), 3),
                  } as CSSProperties}
                  type="button"
                >
                  <span className={styles.todayWordCardCount}>
                    {index + 1} / {todayWords.length}
                  </span>
                  <span className={styles.todayWordExpression}>{word.expression}</span>
                  {word.reading !== "-" ? <span className={styles.todayWordReading}>{word.reading}</span> : null}
                  <span className={styles.todayWordMeaning}>{word.meaning}</span>
                  {word.tag !== "-" ? <small>{word.tag}</small> : null}
                </button>
              ))}
              {isResetPromptVisible ? (
                <div className={styles.todayWordResetOverlay}>
                  <div className={styles.todayWordResetPanel}>
                    <strong>마지막 단어입니다.</strong>
                    <button type="button" onClick={handleResetCards}>
                      처음으로
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
