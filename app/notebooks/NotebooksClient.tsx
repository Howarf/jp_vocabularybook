"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  VocabularyBook,
  VocabularyBookWithCount,
  VocabularyBookWordWithWord,
  WordRow,
} from "@/src/types/vocabulary";
import styles from "./notebooks.module.css";

const wordKeys = ["expression", "word", "term", "japanese"] as const;
const readingKeys = ["reading", "kana", "pronunciation"] as const;
const koreanMeaningKeys = [
  "meaning",
  "korean_meaning",
  "meaning_ko",
  "korean",
] as const;
const tagKeys = ["tag", "level", "jlpt_level"] as const;

// 알 수 없는 값을 화면에 표시할 수 있는 문자열로 변환합니다.
function formatValue(value: unknown) {
  if (value === null || value === undefined || typeof value === "object") {
    return "-";
  }

  return String(value);
}

// 단어 데이터 행에서 후보 키 중 첫 번째 유효한 값을 선택합니다.
function pickValue(row: WordRow, keys: readonly string[]) {
  const matchedKey = keys.find(
    (key) => row[key] !== null && row[key] !== undefined,
  );

  return formatValue(matchedKey ? row[matchedKey] : undefined);
}

// 조인 결과의 words 값을 단일 단어 행으로 정규화합니다.
function normalizeJoinedWord(words: WordRow | WordRow[] | null) {
  if (Array.isArray(words)) {
    return words[0] ?? null;
  }

  return words;
}

// 실제 Supabase 데이터로 내 단어장 목록과 선택한 단어장의 단어 목록을 렌더링합니다.
export default function NotebooksClient() {
  const [vocabularyBooks, setVocabularyBooks] = useState<VocabularyBookWithCount[]>([]);
  const [selectedVocabularyBookId, setSelectedVocabularyBookId] = useState<string | null>(null);
  const [vocabularyBookWords, setVocabularyBookWords] = useState<VocabularyBookWordWithWord[]>([]);
  const [isVocabularyBooksLoading, setIsVocabularyBooksLoading] = useState(true);
  const [isWordsLoading, setIsWordsLoading] = useState(false);
  const [isRemovingWordId, setIsRemovingWordId] = useState<string | null>(null);
  const [updatingLearningStateWordId, setUpdatingLearningStateWordId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const selectedVocabularyBook = useMemo(
    () =>
      vocabularyBooks.find(
        (vocabularyBook) => vocabularyBook.id === selectedVocabularyBookId,
      ) ?? null,
    [selectedVocabularyBookId, vocabularyBooks],
  );

  useEffect(() => {
    let isMounted = true;

    // 현재 로그인한 사용자의 단어장 목록과 단어 개수를 Supabase에서 조회합니다.
    const fetchVocabularyBooks = async () => {
      setErrorMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (sessionError || !session) {
        setErrorMessage(
          sessionError
            ? `세션 확인에 실패했습니다: ${sessionError.message}`
            : "로그인 후 내 단어장을 볼 수 있습니다.",
        );
        setIsVocabularyBooksLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("vocabulary_books")
        .select("id,user_id,title,description,created_at,updated_at,vocabulary_book_words(count)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(
          `단어장을 불러오지 못했습니다. Supabase에 마이그레이션이 적용되었는지 확인해 주세요: ${error.message}`,
        );
        setVocabularyBooks([]);
        setSelectedVocabularyBookId(null);
        setIsVocabularyBooksLoading(false);
        return;
      }

      const nextVocabularyBooks = (data ?? []).map((row) => {
        const vocabularyBook = row as VocabularyBook & {
          vocabulary_book_words?: { count: number }[];
        };

        return {
          id: vocabularyBook.id,
          user_id: vocabularyBook.user_id,
          title: vocabularyBook.title,
          description: vocabularyBook.description,
          created_at: vocabularyBook.created_at,
          updated_at: vocabularyBook.updated_at,
          wordCount: vocabularyBook.vocabulary_book_words?.[0]?.count ?? 0,
        };
      });

      setVocabularyBooks(nextVocabularyBooks);
      setSelectedVocabularyBookId((currentSelectedVocabularyBookId) => {
        if (
          currentSelectedVocabularyBookId &&
          nextVocabularyBooks.some(
            (vocabularyBook) => vocabularyBook.id === currentSelectedVocabularyBookId,
          )
        ) {
          return currentSelectedVocabularyBookId;
        }

        return nextVocabularyBooks[0]?.id ?? null;
      });
      setIsVocabularyBooksLoading(false);
      };

    void fetchVocabularyBooks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 선택한 단어장에 저장된 단어 목록을 원본 words 테이블과 조인해 조회합니다.
    const fetchVocabularyBookWords = async (vocabularyBookId: string) => {
      setIsWordsLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("vocabulary_book_words")
        .select("id,book_id,word_id,status,correct_count,wrong_count,created_at,words(*)")
        .eq("book_id", vocabularyBookId)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(
          `단어장에 담긴 단어를 불러오지 못했습니다. words.id 타입과 연결 테이블의 word_id 타입을 확인해 주세요: ${error.message}`,
        );
        setVocabularyBookWords([]);
        setIsWordsLoading(false);
        return;
      }

      setVocabularyBookWords((data ?? []) as VocabularyBookWordWithWord[]);
      setIsWordsLoading(false);
    };

    if (!selectedVocabularyBookId) {
      return () => {
        isMounted = false;
      };
    }

    void fetchVocabularyBookWords(selectedVocabularyBookId);

    return () => {
      isMounted = false;
    };
  }, [selectedVocabularyBookId]);

  // 사용자가 선택한 단어장 id를 현재 선택 상태로 변경합니다.
  const handleSelectVocabularyBook = (vocabularyBookId: string) => {
    setSelectedVocabularyBookId(vocabularyBookId);
    setVocabularyBookWords([]);
    setFeedbackMessage("");
  };

  // 선택한 단어장에서 특정 단어 연결 데이터를 삭제합니다.
  const handleRemoveWord = async (vocabularyBookWordId: string) => {
    setIsRemovingWordId(vocabularyBookWordId);
    setFeedbackMessage("");

    const { error } = await supabase
      .from("vocabulary_book_words")
      .delete()
      .eq("id", vocabularyBookWordId);

    if (error) {
      setFeedbackMessage(`단어를 제거하지 못했습니다: ${error.message}`);
      setIsRemovingWordId(null);
      return;
    }

    setVocabularyBookWords((currentVocabularyBookWords) =>
      currentVocabularyBookWords.filter(
        (vocabularyBookWord) => vocabularyBookWord.id !== vocabularyBookWordId,
      ),
    );
    setVocabularyBooks((currentVocabularyBooks) =>
      currentVocabularyBooks.map((vocabularyBook) =>
        vocabularyBook.id === selectedVocabularyBookId
          ? { ...vocabularyBook, wordCount: Math.max(0, vocabularyBook.wordCount - 1) }
          : vocabularyBook,
      ),
    );
    setFeedbackMessage("단어장에서 단어를 제거했습니다.");
    setIsRemovingWordId(null);
  };

  // 선택한 단어의 외움 여부를 Supabase 연결 행에 저장합니다.
  const handleUpdateLearningStatus = async (
    vocabularyBookWordId: string,
    nextStatus: boolean,
  ) => {
    setUpdatingLearningStateWordId(vocabularyBookWordId);
    setFeedbackMessage("");

    const { error } = await supabase
      .from("vocabulary_book_words")
      .update({ status: nextStatus })
      .eq("id", vocabularyBookWordId);

    if (error) {
      setFeedbackMessage(`학습 상태를 저장하지 못했습니다: ${error.message}`);
      setUpdatingLearningStateWordId(null);
      return;
    }

    setVocabularyBookWords((currentVocabularyBookWords) =>
      currentVocabularyBookWords.map((vocabularyBookWord) =>
        vocabularyBookWord.id === vocabularyBookWordId
          ? { ...vocabularyBookWord, status: nextStatus }
          : vocabularyBookWord,
      ),
    );
    setFeedbackMessage(nextStatus ? "외움 상태로 저장했습니다." : "학습 중 상태로 저장했습니다.");
    setUpdatingLearningStateWordId(null);
  };

  // 선택한 단어의 정답 또는 오답 횟수를 1 증가시켜 저장합니다.
  const handleIncreaseAnswerCount = async (
    vocabularyBookWordId: string,
    countType: "correct_count" | "wrong_count",
  ) => {
    const currentVocabularyBookWord = vocabularyBookWords.find(
      (vocabularyBookWord) => vocabularyBookWord.id === vocabularyBookWordId,
    );

    if (!currentVocabularyBookWord) {
      return;
    }

    const nextCount = (currentVocabularyBookWord[countType] ?? 0) + 1;

    setUpdatingLearningStateWordId(vocabularyBookWordId);
    setFeedbackMessage("");

    const { error } = await supabase
      .from("vocabulary_book_words")
      .update({ [countType]: nextCount })
      .eq("id", vocabularyBookWordId);

    if (error) {
      setFeedbackMessage(`풀이 횟수를 저장하지 못했습니다: ${error.message}`);
      setUpdatingLearningStateWordId(null);
      return;
    }

    setVocabularyBookWords((currentVocabularyBookWords) =>
      currentVocabularyBookWords.map((vocabularyBookWord) =>
        vocabularyBookWord.id === vocabularyBookWordId
          ? { ...vocabularyBookWord, [countType]: nextCount }
          : vocabularyBookWord,
      ),
    );
    setFeedbackMessage(countType === "correct_count" ? "정답 횟수를 저장했습니다." : "오답 횟수를 저장했습니다.");
    setUpdatingLearningStateWordId(null);
  };

  return (
    <section className={styles.shell} aria-labelledby="notebooks-title">
      <p className={styles.eyebrow}>My vocabulary books</p>
      <h1 id="notebooks-title" className={styles.title}>
        내 단어장
      </h1>
      <p className={styles.description}>
        Supabase에 저장된 내 단어장을 선택하고 담아둔 단어를 확인합니다.
      </p>

      {errorMessage ? (
        <section className={styles.notice} role="alert">
          <strong>데이터를 불러오지 못했습니다.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {feedbackMessage ? (
        <section className={styles.feedback} role="status">
          {feedbackMessage}
        </section>
      ) : null}

      {isVocabularyBooksLoading ? (
        <div className={styles.emptyState}>내 단어장을 불러오는 중입니다...</div>
      ) : null}

      {!isVocabularyBooksLoading && vocabularyBooks.length === 0 ? (
        <div className={styles.emptyState}>
          아직 만든 단어장이 없습니다. 단어 보기 화면에서 단어장을 만들고 단어를 추가해 주세요.
        </div>
      ) : null}

      {vocabularyBooks.length > 0 ? (
        <div className={styles.contentGrid}>
          <section className={styles.panel} aria-label="내 단어장 목록">
            <h2 className={styles.sectionTitle}>단어장 목록</h2>
            <ul className={styles.list}>
              {vocabularyBooks.map((vocabularyBook) => (
                <li className={styles.card} key={vocabularyBook.id}>
                  <button
                    className={`${styles.cardButton} ${selectedVocabularyBookId === vocabularyBook.id ? styles.activeCardButton : ""}`}
                    onClick={() => handleSelectVocabularyBook(vocabularyBook.id)}
                    type="button"
                  >
                    <strong>{vocabularyBook.title}</strong>
                    <span>{vocabularyBook.description ?? "설명 없는 단어장입니다."}</span>
                    <small>{vocabularyBook.wordCount}개 단어</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.panel} aria-label="선택한 단어장의 단어 목록">
            <div className={styles.selectedHeader}>
              <div>
                <p className={styles.selectedLabel}>선택한 단어장</p>
                <h2 className={styles.sectionTitle}>
                  {selectedVocabularyBook?.title ?? "단어장을 선택해 주세요"}
                </h2>
              </div>
              {selectedVocabularyBook ? (
                <span className={styles.countBadge}>{selectedVocabularyBook.wordCount}개</span>
              ) : null}
            </div>

            {isWordsLoading ? (
              <div className={styles.emptyState}>단어를 불러오는 중입니다...</div>
            ) : null}

            {!isWordsLoading && selectedVocabularyBook && vocabularyBookWords.length === 0 ? (
              <div className={styles.emptyState}>이 단어장에 담긴 단어가 없습니다.</div>
            ) : null}

            {!isWordsLoading && vocabularyBookWords.length > 0 ? (
              <ul className={styles.wordList}>
                {vocabularyBookWords.map((vocabularyBookWord) => {
                  const word = normalizeJoinedWord(vocabularyBookWord.words);
                  const wordText = word ? pickValue(word, wordKeys) : "삭제되었거나 찾을 수 없는 단어";
                  const readingText = word ? pickValue(word, readingKeys) : "-";
                  const meaningText = word ? pickValue(word, koreanMeaningKeys) : "원본 words 데이터를 확인해 주세요.";
                  const tagText = word ? pickValue(word, tagKeys) : "-";
                  const isMemorized = Boolean(vocabularyBookWord.status);
                  const correctCount = vocabularyBookWord.correct_count ?? 0;
                  const wrongCount = vocabularyBookWord.wrong_count ?? 0;
                  const isLearningStateUpdating = updatingLearningStateWordId === vocabularyBookWord.id;

                  return (
                    <li className={styles.wordCard} key={vocabularyBookWord.id}>
                      <div className={styles.wordInfo}>
                        <div className={styles.wordTitleRow}>
                          <strong>{wordText}</strong>
                          {readingText !== "-" ? <span>{readingText}</span> : null}
                        </div>
                        <p>{meaningText}</p>
                        {tagText !== "-" ? <small>{tagText}</small> : null}
                        <div className={styles.learningStatePanel}>
                          <div className={styles.learningStateHeader}>
                            <span className={`${styles.statusBadge} ${isMemorized ? styles.memorizedBadge : styles.learningBadge}`}>
                              {isMemorized ? "외움" : "학습 중"}
                            </span>
                            <span className={styles.answerCountText}>
                              정답 {correctCount}회 · 오답 {wrongCount}회
                            </span>
                          </div>
                          <div className={styles.learningActionGrid}>
                            <button
                              className={styles.learningActionButton}
                              disabled={isLearningStateUpdating || !isMemorized}
                              onClick={() => handleUpdateLearningStatus(vocabularyBookWord.id, false)}
                              type="button"
                            >
                              학습 중
                            </button>
                            <button
                              className={styles.learningActionButton}
                              disabled={isLearningStateUpdating || isMemorized}
                              onClick={() => handleUpdateLearningStatus(vocabularyBookWord.id, true)}
                              type="button"
                            >
                              외움
                            </button>
                            <button
                              className={styles.countActionButton}
                              disabled={isLearningStateUpdating}
                              onClick={() => handleIncreaseAnswerCount(vocabularyBookWord.id, "correct_count")}
                              type="button"
                            >
                              정답 +1
                            </button>
                            <button
                              className={styles.countActionButton}
                              disabled={isLearningStateUpdating}
                              onClick={() => handleIncreaseAnswerCount(vocabularyBookWord.id, "wrong_count")}
                              type="button"
                            >
                              오답 +1
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        className={styles.removeButton}
                        disabled={isRemovingWordId === vocabularyBookWord.id || isLearningStateUpdating}
                        onClick={() => handleRemoveWord(vocabularyBookWord.id)}
                        type="button"
                      >
                        {isRemovingWordId === vocabularyBookWord.id ? "제거 중" : "제거"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
