"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { VocabularyBook, WordRow } from "@/src/types/vocabulary";
import WordCard from "./WordCard";
import styles from "./words.module.css";

type FilterLabel = "전체" | "N5" | "N4" | "N3" | "N2";
type SelectedWord = {
  id: number;
  word: string;
  reading: string;
};

const pageSize = 50;
const tagOptions: { label: FilterLabel; dbValue?: string }[] = [
  { label: "전체" },
  { label: "N5", dbValue: "JLPT_N5" },
  { label: "N4", dbValue: "JLPT_N4" },
  { label: "N3", dbValue: "JLPT_N3" },
  { label: "N2", dbValue: "JLPT_N2" },
];

const wordKeys = ["expression", "word", "term", "japanese"] as const;
const readingKeys = ["reading", "kana", "pronunciation"] as const;
const koreanMeaningKeys = [
  "meaning",
  "korean_meaning",
  "meaning_ko",
  "korean",
] as const;
const englishMeaningKeys = ["english_meaning", "meaning_en"] as const;
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

// 선택한 필터 라벨에 대응하는 데이터베이스 태그 값을 반환합니다.
function getDbTag(label: FilterLabel) {
  return tagOptions.find((option) => option.label === label)?.dbValue;
}

// Supabase 단어 데이터를 필터링하고 무한 스크롤로 보여주는 클라이언트 화면을 렌더링합니다.
export default function WordsClient() {
  const [selectedFilter, setSelectedFilter] = useState<FilterLabel>("전체");
  const [words, setWords] = useState<WordRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [vocabularyBooks, setVocabularyBooks] = useState<VocabularyBook[]>([]);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [newVocabularyBookTitle, setNewVocabularyBookTitle] = useState("");
  const [isVocabularyBookLoading, setIsVocabularyBookLoading] = useState(false);
  const [isVocabularyBookSubmitting, setIsVocabularyBookSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);

  // 지정한 위치와 필터에 맞는 단어 목록을 Supabase에서 불러옵니다.
  const loadWords = useCallback(
    async (nextOffset: number, filter: FilterLabel, shouldReset = false) => {
      if (isLoadingRef.current) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setErrorMessage("");

      const from = nextOffset;
      const to = nextOffset + pageSize - 1;
      let query = supabase.from("words").select("*").range(from, to);
      const dbTag = getDbTag(filter);

      if (dbTag) {
        query = query.eq("tag", dbTag);
      }

      const { data, error } = await query;

      if (error) {
        setErrorMessage(error.message);
        isLoadingRef.current = false;
        setIsLoading(false);
        return;
      }

      const nextWords = (data ?? []) as WordRow[];

      setWords((currentWords) =>
        shouldReset ? nextWords : [...currentWords, ...nextWords],
      );
      setHasMore(nextWords.length === pageSize);
      isLoadingRef.current = false;
      setIsLoading(false);
    },
    [],
  );

  // 현재 로그인한 사용자의 단어장 목록을 Supabase에서 불러옵니다.
  const loadVocabularyBooks = useCallback(async () => {
    setIsVocabularyBookLoading(true);
    setFeedbackMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setFeedbackMessage(`세션 확인에 실패했습니다: ${sessionError.message}`);
      setIsVocabularyBookLoading(false);
      return;
    }

    if (!session) {
      setFeedbackMessage("로그인 후 단어장을 사용할 수 있습니다.");
      setIsVocabularyBookLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_books")
      .select("id,user_id,title,description,created_at,updated_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setFeedbackMessage(
        `단어장 목록을 불러오지 못했습니다. Supabase에 마이그레이션이 적용되었는지 확인해 주세요: ${error.message}`,
      );
      setVocabularyBooks([]);
      setIsVocabularyBookLoading(false);
      return;
    }

    setVocabularyBooks((data ?? []) as VocabularyBook[]);
    setIsVocabularyBookLoading(false);
  }, []);

  useEffect(() => {
    void loadWords(0, selectedFilter, true);
  }, [loadWords, selectedFilter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setToastMessage("");
    }, 2400);

    return () => window.clearTimeout(toastTimer);
  }, [toastMessage]);

  // 선택한 단어 필터를 변경하고 현재 목록 상태를 초기화합니다.
  const handleFilterChange = (filter: FilterLabel) => {
    setSelectedFilter(filter);
    setWords([]);
    setHasMore(true);
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry?.isIntersecting && !isLoading) {
          void loadWords(words.length, selectedFilter);
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadWords, selectedFilter, words.length]);

  // 선택한 단어를 단어장 선택 모달에 표시합니다.
  const openNotebookModal = (word: SelectedWord) => {
    setSelectedWord(word);
    setFeedbackMessage("");
    setNewVocabularyBookTitle("");
    void loadVocabularyBooks();
  };

  // 단어장 선택 모달을 닫고 입력 중인 단어장 이름을 초기화합니다.
  const closeNotebookModal = () => {
    setSelectedWord(null);
    setNewVocabularyBookTitle("");
  };

  // 입력한 제목으로 사용자 단어장을 Supabase에 생성합니다.
  const handleCreateVocabularyBook = async () => {
    const trimmedTitle = newVocabularyBookTitle.trim();

    if (!trimmedTitle) {
      setFeedbackMessage("새 단어장 이름을 입력해 주세요.");
      return;
    }

    setIsVocabularyBookSubmitting(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setFeedbackMessage(
        sessionError
          ? `세션 확인에 실패했습니다: ${sessionError.message}`
          : "로그인 후 단어장을 만들 수 있습니다.",
      );
      setIsVocabularyBookSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_books")
      .insert({ title: trimmedTitle, user_id: session.user.id })
      .select("id,user_id,title,description,created_at,updated_at")
      .single();

    if (error) {
      setFeedbackMessage(
        `단어장을 만들지 못했습니다. Supabase에 마이그레이션이 적용되었는지 확인해 주세요: ${error.message}`,
      );
      setIsVocabularyBookSubmitting(false);
      return;
    }

    setVocabularyBooks((currentVocabularyBooks) => [
      data as VocabularyBook,
      ...currentVocabularyBooks,
    ]);
    setFeedbackMessage(`'${trimmedTitle}' 단어장을 만들었습니다.`);
    setNewVocabularyBookTitle("");
    setIsVocabularyBookSubmitting(false);
  };

  // 선택한 단어장에 현재 단어와 원본 단어의 연결 데이터를 저장합니다.
  const handleSelectVocabularyBook = async (vocabularyBook: VocabularyBook) => {
    if (!selectedWord) {
      return;
    }

    setIsVocabularyBookSubmitting(true);
    setFeedbackMessage("");

    const { data: existingVocabularyBookWord, error: existingVocabularyBookWordError } =
      await supabase
        .from("vocabulary_book_words")
        .select("id")
        .eq("book_id", vocabularyBook.id)
        .eq("word_id", selectedWord.id)
        .maybeSingle();

    if (existingVocabularyBookWordError) {
      setFeedbackMessage(
        `단어 추가 전 중복 여부를 확인하지 못했습니다: ${existingVocabularyBookWordError.message}`,
      );
      setIsVocabularyBookSubmitting(false);
      return;
    }

    if (existingVocabularyBookWord) {
      setFeedbackMessage("이미 추가된 단어입니다.");
      setIsVocabularyBookSubmitting(false);
      return;
    }

    const { error } = await supabase.from("vocabulary_book_words").insert({
      book_id: vocabularyBook.id,
      word_id: selectedWord.id,
    });

    if (error) {
      if (error.code === "23505") {
        setFeedbackMessage("이미 추가된 단어입니다.");
        setIsVocabularyBookSubmitting(false);
        return;
      }

      setFeedbackMessage(
        `단어를 추가하지 못했습니다. table.sql의 vocabulary_book_words.book_id 및 word_id 외래 키와 일치하는지 확인해 주세요: ${error.message}`,
      );
      setIsVocabularyBookSubmitting(false);
      return;
    }

    setSelectedWord(null);
    setNewVocabularyBookTitle("");
    setToastMessage("추가되었습니다.");
    setIsVocabularyBookSubmitting(false);
  };

  return (
    <main className={styles.page}>
      <section className={styles.header} aria-labelledby="words-title">
        <p className={styles.eyebrow}>Vocabulary preview</p>
        <h1 id="words-title" className={styles.title}>
          단어 보기
        </h1>
        <p className={styles.description}>
          Supabase <code>words</code> 테이블에서 50개씩 단어를 불러옵니다.
          카드를 왼쪽으로 밀어 내 단어장에 추가해 보세요.
        </p>
      </section>

      <nav className={styles.filters} aria-label="단어 태그 필터">
        {tagOptions.map((option) => (
          <button
            className={`${styles.filterButton} ${selectedFilter === option.label ? styles.activeFilter : ""}`}
            key={option.label}
            onClick={() => handleFilterChange(option.label)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </nav>

      {errorMessage ? (
        <section className={styles.notice} role="alert">
          <strong>단어를 불러오지 못했습니다.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {!errorMessage && !isLoading && words.length === 0 ? (
        <section className={styles.notice}>
          <strong>표시할 단어가 없습니다.</strong>
          <span>선택한 태그에 해당하는 데이터가 없습니다.</span>
        </section>
      ) : null}

      <ul className={styles.list}>
        {words.map((word, index) => {
          const wordValue = pickValue(word, wordKeys);
          const readingValue = pickValue(word, readingKeys);
          const koreanMeaningValue = pickValue(word, koreanMeaningKeys);
          const englishMeaningValue = pickValue(word, englishMeaningKeys);
          const tagValue = pickValue(word, tagKeys);
          const wordId = word.id;

          return (
            <WordCard
              englishMeaning={englishMeaningValue}
              index={index + 1}
              key={String(word.id ?? `${wordValue}-${index}`)}
              koreanMeaning={koreanMeaningValue}
              onAddToNotebook={() =>
                  typeof wordId !== "number"
                    ? setFeedbackMessage("이 단어에는 저장에 필요한 id가 없습니다.")
                    : openNotebookModal({
                      id: wordId,
                      word: wordValue,
                      reading: readingValue,
                    })
              }
              reading={readingValue}
              tag={tagValue}
              word={wordValue}
            />
          );
        })}
      </ul>

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {isLoading ? <p className={styles.loading}>단어를 불러오는 중...</p> : null}
      {!hasMore && words.length > 0 ? (
        <p className={styles.endMessage}>마지막 단어까지 불러왔습니다.</p>
      ) : null}

      {selectedWord ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="notebook-modal-title"
            aria-modal="true"
            className={styles.modalCard}
            role="dialog"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Add to vocabulary book</p>
                <h2 id="notebook-modal-title" className={styles.modalTitle}>
                  단어장 선택
                </h2>
              </div>
              <button
                aria-label="단어장 선택 팝업 닫기"
                className={styles.closeButton}
                onClick={closeNotebookModal}
                type="button"
              >
                ×
              </button>
            </div>

            <p className={styles.selectedWordText}>
              <strong>{selectedWord.word}</strong>
              {selectedWord.reading !== "-" ? <span>{selectedWord.reading}</span> : null}
            </p>

            {isVocabularyBookLoading ? (
              <p className={styles.emptyNotebookText}>내 단어장을 불러오는 중입니다...</p>
            ) : null}

            {!isVocabularyBookLoading && vocabularyBooks.length > 0 ? (
              <div className={styles.notebookList}>
                {vocabularyBooks.map((vocabularyBook) => (
                  <button
                    className={styles.notebookButton}
                    disabled={isVocabularyBookSubmitting}
                    key={vocabularyBook.id}
                    onClick={() => handleSelectVocabularyBook(vocabularyBook)}
                    type="button"
                  >
                    {vocabularyBook.title}
                  </button>
                ))}
              </div>
            ) : null}

            {!isVocabularyBookLoading && vocabularyBooks.length === 0 ? (
              <p className={styles.emptyNotebookText}>
                만들어둔 단어장이 없습니다. 아래에서 새 단어장을 만들어 보세요.
              </p>
            ) : null}

            <div className={styles.createNotebookBox}>
              <label className={styles.createNotebookLabel} htmlFor="new-notebook-name">
                새 단어장 만들기
              </label>
              <div className={styles.createNotebookRow}>
                <input
                  className={styles.createNotebookInput}
                  id="new-notebook-name"
                  onChange={(event) => setNewVocabularyBookTitle(event.target.value)}
                  placeholder="예: 매일 복습 단어장"
                  type="text"
                  value={newVocabularyBookTitle}
                />
                <button
                  className={styles.createNotebookButton}
                  disabled={isVocabularyBookSubmitting}
                  onClick={handleCreateVocabularyBook}
                  type="button"
                >
                  {isVocabularyBookSubmitting ? "처리 중..." : "새 단어장 만들기"}
                </button>
              </div>
            </div>

            {feedbackMessage ? (
              <p className={styles.modalFeedback}>{feedbackMessage}</p>
            ) : null}
          </section>
        </div>
      ) : null}

      {toastMessage ? (
        <div className={styles.toast} role="status">
          {toastMessage}
        </div>
      ) : null}
    </main>
  );
}
