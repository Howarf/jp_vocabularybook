"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  VocabularyBookWithCount,
  VocabularyBookWithLearningRows,
  VocabularyBookWordWithWord,
} from "@/src/types/vocabulary";
import {
  normalizeJoinedWord,
  pickWordDisplayValue,
  wordExpressionFields,
  wordKoreanMeaningFields,
  wordReadingFields,
  wordTagFields,
} from "@/src/utils/word";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

const swipeRevealMaximumWidth = 50;
const swipeToggleThresholdWidth = 45;

// 단어장 단어 수와 학습 완료 단어 수로 학습 진행률을 계산합니다.
function calculateLearningProgressPercentage(wordCount: number, learnedWordCount: number) {
  if (wordCount === 0) {
    return 0;
  }

  return Math.round((learnedWordCount / wordCount) * 100);
}

// 이벤트 대상이 카드 드래그보다 우선되어야 하는 조작 요소인지 확인합니다.
function isInteractiveElement(eventTarget: EventTarget | null) {
  return eventTarget instanceof HTMLElement && Boolean(eventTarget.closest("button, a, input, textarea, select"));
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
  const [dragOffsetByWordId, setDragOffsetByWordId] = useState<Record<string, number>>({});
  const [draggingWordId, setDraggingWordId] = useState<string | null>(null);
  const [newVocabularyBookTitle, setNewVocabularyBookTitle] = useState("");
  const [isCreatingVocabularyBook, setIsCreatingVocabularyBook] = useState(false);
  const [isCreateVocabularyBookModalOpen, setIsCreateVocabularyBookModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const pointerStartXRef = useRef<number | null>(null);
  const feedbackToastTimeoutRef = useRef<number | null>(null);

  const selectedVocabularyBook = useMemo(
    () =>
      vocabularyBooks.find(
        (vocabularyBook) => vocabularyBook.id === selectedVocabularyBookId,
      ) ?? null,
    [selectedVocabularyBookId, vocabularyBooks],
  );

  // 현재 로그인한 사용자의 단어장 목록과 학습 진행률을 Supabase에서 조회합니다.
  const fetchVocabularyBooks = useCallback(
    async (shouldSelectFirstVocabularyBook = true) => {
      setErrorMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

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
        .select("id,user_id,title,description,created_at,updated_at,vocabulary_book_words(status)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(
          `단어장을 불러오지 못했습니다. Supabase에 마이그레이션이 적용되었는지 확인해 주세요: ${error.message}`,
        );
        setVocabularyBooks([]);
        setSelectedVocabularyBookId(null);
        setIsVocabularyBooksLoading(false);
        return;
      }

      const nextVocabularyBooks = (data ?? []).map((vocabularyBook: VocabularyBookWithLearningRows) => {
        const vocabularyBookWords = vocabularyBook.vocabulary_book_words ?? [];
        const wordCount = vocabularyBookWords.length;
        const learnedWordCount = vocabularyBookWords.filter(
          (vocabularyBookWord) => vocabularyBookWord.status === true,
        ).length;

        return {
          id: vocabularyBook.id,
          user_id: vocabularyBook.user_id,
          title: vocabularyBook.title,
          description: vocabularyBook.description,
          created_at: vocabularyBook.created_at,
          updated_at: vocabularyBook.updated_at,
          wordCount,
          learnedWordCount,
          learningProgressPercentage: calculateLearningProgressPercentage(
            wordCount,
            learnedWordCount,
          ),
        };
      });

      setVocabularyBooks(nextVocabularyBooks);
      if (shouldSelectFirstVocabularyBook) {
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
      }
      setIsVocabularyBooksLoading(false);
    },
    [],
  );

  useEffect(() => {
    const vocabularyBooksTimer = window.setTimeout(() => {
      void fetchVocabularyBooks();
    }, 0);

    return () => window.clearTimeout(vocabularyBooksTimer);
  }, [fetchVocabularyBooks]);

  useEffect(() => {
    if (feedbackToastTimeoutRef.current) {
      window.clearTimeout(feedbackToastTimeoutRef.current);
      feedbackToastTimeoutRef.current = null;
    }

    if (!feedbackMessage) {
      return undefined;
    }

    feedbackToastTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage("");
      feedbackToastTimeoutRef.current = null;
    }, 5000);

    return () => {
      if (feedbackToastTimeoutRef.current) {
        window.clearTimeout(feedbackToastTimeoutRef.current);
        feedbackToastTimeoutRef.current = null;
      }
    };
  }, [feedbackMessage]);

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

  // 새 단어장 생성 모달을 열고 이전 입력값을 초기화합니다.
  const handleOpenCreateVocabularyBookModal = () => {
    setNewVocabularyBookTitle("");
    setFeedbackMessage("");
    setIsCreateVocabularyBookModalOpen(true);
  };

  // 새 단어장 생성 모달을 닫고 입력값을 초기화합니다.
  const handleCloseCreateVocabularyBookModal = () => {
    if (isCreatingVocabularyBook) {
      return;
    }

    setNewVocabularyBookTitle("");
    setIsCreateVocabularyBookModalOpen(false);
  };

  // 입력한 제목으로 새 단어장을 만들고 목록을 다시 조회합니다.
  const handleCreateVocabularyBook = async () => {
    const trimmedTitle = newVocabularyBookTitle.trim();

    if (!trimmedTitle) {
      setFeedbackMessage("새 단어장 이름을 입력해 주세요.");
      return;
    }

    setIsCreatingVocabularyBook(true);
    setFeedbackMessage("");

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
      setIsCreatingVocabularyBook(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_books")
      .insert({ title: trimmedTitle, user_id: session.user.id })
      .select("id")
      .single();

    if (error) {
      setFeedbackMessage(`단어장을 만들지 못했습니다: ${error.message}`);
      setIsCreatingVocabularyBook(false);
      return;
    }

    setNewVocabularyBookTitle("");
    setSelectedVocabularyBookId(data.id as string);
    await fetchVocabularyBooks(false);
    setIsCreateVocabularyBookModalOpen(false);
    setFeedbackMessage(`'${trimmedTitle}' 단어장을 만들었습니다.`);
    setIsCreatingVocabularyBook(false);
  };

  // 새 단어장 제목 입력값을 상태에 반영합니다.
  const handleNewVocabularyBookTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setNewVocabularyBookTitle(event.target.value);
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

    const removedVocabularyBookWord = vocabularyBookWords.find(
      (vocabularyBookWord) => vocabularyBookWord.id === vocabularyBookWordId,
    );

    setVocabularyBookWords((currentVocabularyBookWords) =>
      currentVocabularyBookWords.filter(
        (vocabularyBookWord) => vocabularyBookWord.id !== vocabularyBookWordId,
      ),
    );
    setVocabularyBooks((currentVocabularyBooks) =>
      currentVocabularyBooks.map((vocabularyBook) =>
        vocabularyBook.id === selectedVocabularyBookId
          ? {
              ...vocabularyBook,
              wordCount: Math.max(0, vocabularyBook.wordCount - 1),
              learnedWordCount: removedVocabularyBookWord?.status
                ? Math.max(0, vocabularyBook.learnedWordCount - 1)
                : vocabularyBook.learnedWordCount,
              learningProgressPercentage: calculateLearningProgressPercentage(
                Math.max(0, vocabularyBook.wordCount - 1),
                removedVocabularyBookWord?.status
                  ? Math.max(0, vocabularyBook.learnedWordCount - 1)
                  : vocabularyBook.learnedWordCount,
              ),
            }
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
    setVocabularyBooks((currentVocabularyBooks) =>
      currentVocabularyBooks.map((vocabularyBook) => {
        if (vocabularyBook.id !== selectedVocabularyBookId) {
          return vocabularyBook;
        }

        const currentVocabularyBookWord = vocabularyBookWords.find(
          (vocabularyBookWord) => vocabularyBookWord.id === vocabularyBookWordId,
        );
        const wasMemorized = Boolean(currentVocabularyBookWord?.status);
        const learnedWordCount = wasMemorized === nextStatus
          ? vocabularyBook.learnedWordCount
          : vocabularyBook.learnedWordCount + (nextStatus ? 1 : -1);

        return {
          ...vocabularyBook,
          learnedWordCount,
          learningProgressPercentage: calculateLearningProgressPercentage(
            vocabularyBook.wordCount,
            learnedWordCount,
          ),
        };
      }),
    );
    setFeedbackMessage(nextStatus ? "외움 상태로 저장했습니다." : "학습 중 상태로 저장했습니다.");
    setUpdatingLearningStateWordId(null);
  };

  // 선택한 단어의 외움 여부를 현재 상태의 반대로 전환합니다.
  const handleToggleLearningStatus = (vocabularyBookWord: VocabularyBookWordWithWord) => {
    if (updatingLearningStateWordId || isRemovingWordId === vocabularyBookWord.id) {
      return;
    }

    void handleUpdateLearningStatus(vocabularyBookWord.id, !Boolean(vocabularyBookWord.status));
  };

  // 저장 단어 카드의 포인터 시작 위치를 저장하고 슬라이드 상태를 활성화합니다.
  const handleWordCardPointerDown = (
    vocabularyBookWordId: string,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (isInteractiveElement(event.target) || updatingLearningStateWordId || isRemovingWordId === vocabularyBookWordId) {
      return;
    }

    pointerStartXRef.current = event.clientX;
    setDraggingWordId(vocabularyBookWordId);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // 저장 단어 카드의 왼쪽 슬라이드 거리를 화면 상태에 반영합니다.
  const handleWordCardPointerMove = (
    vocabularyBookWordId: string,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (pointerStartXRef.current === null || draggingWordId !== vocabularyBookWordId) {
      return;
    }

    const dragDifference = event.clientX - pointerStartXRef.current;
    const nextDragOffset = Math.min(0, Math.max(dragDifference, -swipeRevealMaximumWidth));

    setDragOffsetByWordId((currentDragOffsetByWordId) => ({
      ...currentDragOffsetByWordId,
      [vocabularyBookWordId]: nextDragOffset,
    }));
  };

  // 저장 단어 카드의 슬라이드 종료 시 임계값에 따라 학습 상태를 토글합니다.
  const handleWordCardPointerEnd = (
    vocabularyBookWord: VocabularyBookWordWithWord,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (pointerStartXRef.current === null || draggingWordId !== vocabularyBookWord.id) {
      return;
    }

    const currentDragOffset = dragOffsetByWordId[vocabularyBookWord.id] ?? 0;

    if (currentDragOffset <= -swipeToggleThresholdWidth) {
      handleToggleLearningStatus(vocabularyBookWord);
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerStartXRef.current = null;
    setDraggingWordId(null);
    setDragOffsetByWordId((currentDragOffsetByWordId) => ({
      ...currentDragOffsetByWordId,
      [vocabularyBookWord.id]: 0,
    }));
  };

  return (
    <section className={sharedStyles.contentShell} aria-labelledby="notebooks-title">
      <p className={sharedStyles.eyebrowText}>My vocabulary books</p>
      <h1 id="notebooks-title" className={sharedStyles.pageTitle}>
        내 단어장
      </h1>
      <p className={sharedStyles.pageDescription}>
        단어들을 학습하고 옆으로 밀어 단어장을 clear하세요.
      </p>

      {errorMessage ? (
        <section className={styles.notice} role="alert">
          <strong>데이터를 불러오지 못했습니다.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {isVocabularyBooksLoading ? (
        <div className={styles.emptyState}>내 단어장을 불러오는 중입니다...</div>
      ) : null}

      {!isVocabularyBooksLoading ? (
        <div className={styles.contentGrid}>
          <section className={[sharedStyles.surfacePanel, styles.panel].join(" ")} aria-label="내 단어장 목록">
            <div className={styles.listHeader}>
              <h2 className={sharedStyles.sectionTitle}>단어장 목록</h2>
              <button
                className={styles.createInlineButton}
                onClick={handleOpenCreateVocabularyBookModal}
                type="button"
              >
                새 단어장 만들기
              </button>
            </div>
            <ul className={[sharedStyles.responsiveList, styles.list].join(" ")}>
              {vocabularyBooks.length === 0 ? (
                <li className={styles.emptyListItem}>아직 만든 단어장이 없습니다.</li>
              ) : null}
              {vocabularyBooks.map((vocabularyBook) => (
                <li className={styles.card} key={vocabularyBook.id}>
                  <button
                    className={`${sharedStyles.interactiveCardButton} ${styles.cardButton} ${selectedVocabularyBookId === vocabularyBook.id ? styles.activeCardButton : ""}`}
                    onClick={() => handleSelectVocabularyBook(vocabularyBook.id)}
                    type="button"
                  >
                    <div className={styles.cardTitleRow}>
                      <strong>{vocabularyBook.title}</strong>
                      <small>
                        {vocabularyBook.learnedWordCount} / {vocabularyBook.wordCount}개 학습 · {vocabularyBook.learningProgressPercentage}%
                      </small>
                    </div>
                    <span>{vocabularyBook.description ?? "설명 없는 단어장입니다."}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className={[sharedStyles.surfacePanel, styles.panel].join(" ")} aria-label="선택한 단어장의 단어 목록">
            <div className={styles.selectedHeader}>
              <div>
                <p className={sharedStyles.selectedLabel}>선택한 단어장</p>
                <h2 className={sharedStyles.sectionTitle}>
                  {selectedVocabularyBook?.title ?? "단어장을 선택해 주세요"}
                </h2>
              </div>
              {selectedVocabularyBook ? (
                <span className={sharedStyles.countBadge}>{selectedVocabularyBook.wordCount}개</span>
              ) : null}
            </div>

            {isWordsLoading ? (
              <div className={styles.emptyState}>단어를 불러오는 중입니다...</div>
            ) : null}

            {!isWordsLoading && selectedVocabularyBook && vocabularyBookWords.length === 0 ? (
              <div className={styles.emptyState}>이 단어장에 담긴 단어가 없습니다.</div>
            ) : null}

            {!isWordsLoading && vocabularyBookWords.length > 0 ? (
              <ul className={[sharedStyles.responsiveList, styles.wordList].join(" ")}>
                {vocabularyBookWords.map((vocabularyBookWord) => {
                  const word = normalizeJoinedWord(vocabularyBookWord.words);
                  const wordText = word ? pickWordDisplayValue(word, wordExpressionFields) : "삭제되었거나 찾을 수 없는 단어";
                  const readingText = word ? pickWordDisplayValue(word, wordReadingFields) : "-";
                  const meaningText = word ? pickWordDisplayValue(word, wordKoreanMeaningFields) : "원본 words 데이터를 확인해 주세요.";
                  const tagText = word ? pickWordDisplayValue(word, wordTagFields) : "-";
                  const isMemorized = Boolean(vocabularyBookWord.status);
                  const correctCount = vocabularyBookWord.correct_count ?? 0;
                  const wrongCount = vocabularyBookWord.wrong_count ?? 0;
                  const isLearningStateUpdating = updatingLearningStateWordId === vocabularyBookWord.id;
                  const wordCardDragOffset = dragOffsetByWordId[vocabularyBookWord.id] ?? 0;
                  const wordCardRevealWidth = Math.abs(wordCardDragOffset);
                  const nextLearningStatusText = isMemorized ? "학습 중으로 변경" : "외움으로 변경";
                  const swipeWordCardStyle = {
                    "--slide-reveal": `${wordCardRevealWidth}px`,
                  } as CSSProperties;

                  return (
                    <li className={styles.wordCard} key={vocabularyBookWord.id}>
                      <button
                        aria-label={`${wordText} 상태를 ${nextLearningStatusText}`}
                        className={styles.slideActionButton}
                        disabled={isLearningStateUpdating || isRemovingWordId === vocabularyBookWord.id}
                        onClick={() => handleToggleLearningStatus(vocabularyBookWord)}
                        type="button"
                      >
                        {isLearningStateUpdating ? "변경 중" : nextLearningStatusText}
                      </button>
                      <div
                        className={styles.swipeWordCard}
                        data-dragging={draggingWordId === vocabularyBookWord.id}
                        onPointerCancel={(event) => handleWordCardPointerEnd(vocabularyBookWord, event)}
                        onPointerDown={(event) => handleWordCardPointerDown(vocabularyBookWord.id, event)}
                        onPointerLeave={(event) => handleWordCardPointerEnd(vocabularyBookWord, event)}
                        onPointerMove={(event) => handleWordCardPointerMove(vocabularyBookWord.id, event)}
                        onPointerUp={(event) => handleWordCardPointerEnd(vocabularyBookWord, event)}
                        style={swipeWordCardStyle}
                      >
                        <div className={styles.wordTopRow}>
                          <div className={styles.wordTitleRow}>
                            <strong>{wordText}</strong>
                            {readingText !== "-" ? <span>{readingText}</span> : null}
                          </div>
                          <button
                            className={styles.removeButton}
                            disabled={isRemovingWordId === vocabularyBookWord.id || isLearningStateUpdating}
                            onClick={() => handleRemoveWord(vocabularyBookWord.id)}
                            type="button"
                          >
                            {isRemovingWordId === vocabularyBookWord.id ? "제거 중" : "제거"}
                          </button>
                        </div>
                        <div className={styles.wordMeaningRow}>
                          <p>{meaningText}</p>
                          {tagText !== "-" ? <small>{tagText}</small> : null}
                        </div>
                        <div className={[sharedStyles.learningStatePanel, styles.learningStatePanel].join(" ")}>
                          <div className={styles.learningStateHeader}>
                            <span className={`${sharedStyles.statusBadge} ${isMemorized ? sharedStyles.memorizedBadge : sharedStyles.learningBadge}`}>
                              {isMemorized ? "외움" : "학습 중"}
                            </span>
                            <span className={sharedStyles.answerCountText}>
                              정답 {correctCount}회 · 오답 {wrongCount}회
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}

      {isCreateVocabularyBookModalOpen ? (
        <div className={[sharedStyles.modalBackdrop, styles.modalBackdrop].join(" ")} role="presentation">
          <section
            aria-labelledby="create-vocabulary-book-modal-title"
            aria-modal="true"
            className={styles.modalCard}
            role="dialog"
          >
            <div className={[sharedStyles.modalHeader, styles.modalHeader].join(" ")}>
              <div>
                <p className={[sharedStyles.modalEyebrow, styles.modalEyebrow].join(" ")}>Create vocabulary book</p>
                <h2 id="create-vocabulary-book-modal-title" className={[sharedStyles.modalTitle, styles.modalTitle].join(" ")}>
                  새 단어장 만들기
                </h2>
              </div>
              <button
                aria-label="새 단어장 만들기 팝업 닫기"
                className={[sharedStyles.modalCloseButton, styles.modalCloseButton].join(" ")}
                disabled={isCreatingVocabularyBook}
                onClick={handleCloseCreateVocabularyBookModal}
                type="button"
              >
                ×
              </button>
            </div>
            <div className={styles.modalForm}>
              <label className={styles.createLabel} htmlFor="new-vocabulary-book-title">
                단어장 이름
              </label>
              <input
                className={styles.createInput}
                id="new-vocabulary-book-title"
                onChange={handleNewVocabularyBookTitleChange}
                placeholder="예: 매일 복습 단어장"
                type="text"
                value={newVocabularyBookTitle}
              />
              <div className={styles.modalActionRow}>
                <button
                  className={styles.cancelButton}
                  disabled={isCreatingVocabularyBook}
                  onClick={handleCloseCreateVocabularyBookModal}
                  type="button"
                >
                  취소
                </button>
                <button
                  className={styles.createButton}
                  disabled={isCreatingVocabularyBook}
                  onClick={handleCreateVocabularyBook}
                  type="button"
                >
                  {isCreatingVocabularyBook ? "생성 중" : "생성"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {feedbackMessage ? (
        <section className={[sharedStyles.toastMessage, styles.feedbackToast].join(" ")} role="status">
          {feedbackMessage}
        </section>
      ) : null}
    </section>
  );
}
