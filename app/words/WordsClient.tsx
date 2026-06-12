"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import AppHeader from "@/src/components/AppHeader";
import type { VocabularyBook, WordRow } from "@/src/types/vocabulary";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";
import {
  getJlptDatabaseTag,
  sanitizeWordSearchTerm,
  type JlptFilterLabel,
} from "@/src/utils/word";
import { createVocabularyBookForUser } from "@/src/utils/vocabularyBook";
import NotebookAddModal from "./NotebookAddModal";
import WordList, { type SelectedWord } from "./WordList";
import WordsToast from "./WordsToast";
import WordsToolbar from "./WordsToolbar";
import sharedStyles from "../shared.module.css";
import styles from "./words.module.css";

const pageSize = 50;

// Supabase 단어 데이터를 필터링하고 무한 스크롤로 보여주는 클라이언트 화면을 렌더링합니다.
export default function WordsClient() {
  const [selectedFilter, setSelectedFilter] = useState<JlptFilterLabel>("전체");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [words, setWords] = useState<WordRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [newVocabularyBookDescription, setNewVocabularyBookDescription] = useState("");
  const [newVocabularyBookTitle, setNewVocabularyBookTitle] = useState("");
  const [isVocabularyBookSubmitting, setIsVocabularyBookSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const vocabularyBooks = useVocabularyBookStore((state) => state.vocabularyBooks);
  const isVocabularyBooksLoading = useVocabularyBookStore((state) => state.isVocabularyBooksLoading);
  const vocabularyBookStoreErrorMessage = useVocabularyBookStore((state) => state.errorMessage);
  const loadVocabularyBooksForUser = useVocabularyBookStore((state) => state.loadVocabularyBooksForUser);
  const addVocabularyBook = useVocabularyBookStore((state) => state.addVocabularyBook);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const activeWordsRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    // 단어장 소유자 식별에 필요한 현재 사용자 id를 한 번만 불러옵니다.
    const loadCurrentUserId = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        setFeedbackMessage(`사용자 정보를 확인하지 못했습니다: ${error.message}`);
        return;
      }

      setCurrentUserId(user?.id ?? null);
    };

    void loadCurrentUserId();

    return () => {
      isMounted = false;
    };
  }, []);

  // 지정한 조건과 위치에 맞는 단어 목록을 Supabase에서 불러옵니다.
  const loadWords = useCallback(
    async (
      nextOffset: number,
      filter: JlptFilterLabel,
      searchTerm: string,
      shouldReset = false,
    ) => {
      if (isLoadingRef.current && !shouldReset) {
        return;
      }

      const wordsRequestId = activeWordsRequestIdRef.current + 1;
      activeWordsRequestIdRef.current = wordsRequestId;
      isLoadingRef.current = true;
      setIsLoading(true);
      setErrorMessage("");

      if (shouldReset) {
        setWords([]);
        setHasMore(true);
      }

      try {
        const from = nextOffset;
        const to = nextOffset + pageSize - 1;
        const sanitizedSearchTerm = sanitizeWordSearchTerm(searchTerm);
        let query = supabase
          .from("words")
          .select("*")
          .order("id", { ascending: true })
          .range(from, to);
        const dbTag = getJlptDatabaseTag(filter);

        if (dbTag) {
          query = query.eq("tag", dbTag);
        }

        if (sanitizedSearchTerm) {
          const searchPattern = `%${sanitizedSearchTerm}%`;
          query = query.or(
            [
              `expression.ilike.${searchPattern}`,
              `reading.ilike.${searchPattern}`,
              `meaning_ko.ilike.${searchPattern}`,
              `meaning_en.ilike.${searchPattern}`,
            ].join(","),
          );
        }

        const { data, error } = await query;

        if (activeWordsRequestIdRef.current !== wordsRequestId) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        const nextWords: WordRow[] = data ?? [];

        setWords((currentWords) =>
          shouldReset ? nextWords : [...currentWords, ...nextWords],
        );
        setHasMore(nextWords.length === pageSize);
      } catch (unknownError) {
        if (activeWordsRequestIdRef.current !== wordsRequestId) {
          return;
        }

        setErrorMessage(
          unknownError instanceof Error
            ? unknownError.message
            : "단어를 불러오는 중 알 수 없는 오류가 발생했습니다.",
        );
      } finally {
        if (activeWordsRequestIdRef.current === wordsRequestId) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const debounceTimer = window.setTimeout(() => {
      setDebouncedSearchTerm(sanitizeWordSearchTerm(searchInputValue));
    }, 350);

    return () => window.clearTimeout(debounceTimer);
  }, [searchInputValue]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadWords(0, selectedFilter, debouncedSearchTerm, true);
    });
  }, [debouncedSearchTerm, loadWords, selectedFilter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const toastTimer = window.setTimeout(() => {
      setToastMessage("");
    }, 2400);

    return () => window.clearTimeout(toastTimer);
  }, [toastMessage]);

  // 선택한 단어 필터를 변경합니다.
  const handleFilterChange = (filter: JlptFilterLabel) => {
    setSelectedFilter(filter);
  };

  // 입력한 검색어를 검색 상태에 반영합니다.
  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(event.target.value);
  };

  // 입력한 새 단어장 제목을 생성 폼 상태에 반영합니다.
  const handleNewVocabularyBookTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewVocabularyBookTitle(event.target.value);
  };

  // 입력한 새 단어장 설명을 생성 폼 상태에 반영합니다.
  const handleNewVocabularyBookDescriptionChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewVocabularyBookDescription(event.target.value);
  };

  // 단어 id가 없는 항목을 단어장에 추가하지 못한다는 메시지를 표시합니다.
  const handleInvalidWordId = () => {
    setFeedbackMessage("이 단어에는 저장에 필요한 id가 없습니다.");
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
          void loadWords(
            words.length,
            selectedFilter,
            debouncedSearchTerm,
          );
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [debouncedSearchTerm, hasMore, isLoading, loadWords, selectedFilter, words.length]);

  // 선택한 단어를 단어장 선택 모달에 표시합니다.
  const openNotebookModal = (word: SelectedWord) => {
    setSelectedWord(word);
    setFeedbackMessage("");
    setNewVocabularyBookDescription("");
    setNewVocabularyBookTitle("");

    if (!currentUserId) {
      setFeedbackMessage("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    void loadVocabularyBooksForUser(currentUserId);
  };

  // 단어장 선택 모달을 닫고 입력 중인 단어장 이름을 초기화합니다.
  const closeNotebookModal = () => {
    setSelectedWord(null);
    setNewVocabularyBookDescription("");
    setNewVocabularyBookTitle("");
  };

  // 입력한 제목으로 사용자 단어장을 Supabase에 생성합니다.
  const handleCreateVocabularyBook = async () => {
    const trimmedDescription = newVocabularyBookDescription.trim();
    const trimmedTitle = newVocabularyBookTitle.trim();

    if (!trimmedTitle) {
      setFeedbackMessage("새 단어장 이름을 입력해 주세요.");
      return;
    }

    setIsVocabularyBookSubmitting(true);

    if (!currentUserId) {
      setFeedbackMessage("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      setIsVocabularyBookSubmitting(false);
      return;
    }

    const { data, error } = await createVocabularyBookForUser(
      trimmedTitle,
      trimmedDescription || null,
      currentUserId,
    );

    if (error) {
      setIsVocabularyBookSubmitting(false);
      return;
    }

    addVocabularyBook(data);
    setFeedbackMessage(`'${trimmedTitle}' 단어장을 만들었습니다.`);
    setNewVocabularyBookDescription("");
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
    setNewVocabularyBookDescription("");
    setNewVocabularyBookTitle("");
    setToastMessage("추가되었습니다.");
    setIsVocabularyBookSubmitting(false);
  };

  return (
    <main className={sharedStyles.contentPage}>
      <AppHeader />

      <section className={styles.header} aria-labelledby="words-title">
        <p className={sharedStyles.eyebrowText}>JLPT lexicon</p>
        <h1 id="words-title" className={sharedStyles.pageTitle}>
          JLPT 사전
        </h1>
        <p className={sharedStyles.pageDescription}>
          N5에서 N2까지의 어휘들을 살펴보고<br/>
          단어를 왼쪽으로 밀어 단어장에 추가해 보세요.
        </p>
      </section>

      <WordsToolbar
        isLoading={isLoading}
        onSearchTermChange={handleSearchInputChange}
        onSelectedTagChange={handleFilterChange}
        searchTerm={searchInputValue}
        selectedTag={selectedFilter}
      />

      <WordList
        errorMessage={errorMessage}
        hasMore={hasMore}
        isLoading={isLoading}
        onAddToNotebook={openNotebookModal}
        onInvalidWordId={handleInvalidWordId}
        sentinelRef={sentinelRef}
        words={words}
      />

      {selectedWord ? (
        <NotebookAddModal
          feedbackMessage={feedbackMessage || vocabularyBookStoreErrorMessage}
          isVocabularyBookLoading={isVocabularyBooksLoading}
          isVocabularyBookSubmitting={isVocabularyBookSubmitting}
          newVocabularyBookDescription={newVocabularyBookDescription}
          newVocabularyBookTitle={newVocabularyBookTitle}
          onClose={closeNotebookModal}
          onCreateVocabularyBook={handleCreateVocabularyBook}
          onNewVocabularyBookDescriptionChange={handleNewVocabularyBookDescriptionChange}
          onNewVocabularyBookTitleChange={handleNewVocabularyBookTitleChange}
          onSelectVocabularyBook={handleSelectVocabularyBook}
          selectedWord={selectedWord}
          vocabularyBooks={vocabularyBooks}
        />
      ) : null}

      <WordsToast message={toastMessage} />
    </main>
  );
}
