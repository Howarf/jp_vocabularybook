"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type {
  VocabularyBookWordWithWord,
} from "@/src/types/vocabulary";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";
import { createVocabularyBookForUser } from "@/src/utils/vocabularyBook";
import CreateNotebookModal from "./CreateNotebookModal";
import NotebookList from "./NotebookList";
import NotebooksToast from "./NotebooksToast";
import SavedWordList from "./SavedWordList";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

const swipeRevealMaximumWidth = 50;
const swipeToggleThresholdWidth = 45;

type NotebooksClientProps = {
  initialVocabularyBookId?: string | null;
};

// 이벤트 대상이 카드 드래그보다 우선되어야 하는 조작 요소인지 확인합니다.
function isInteractiveElement(eventTarget: EventTarget | null) {
  return eventTarget instanceof HTMLElement && Boolean(eventTarget.closest("button, a, input, textarea, select"));
}

// 실제 Supabase 데이터로 내 단어장 목록과 선택한 단어장의 단어 목록을 렌더링합니다.
export default function NotebooksClient({ initialVocabularyBookId = null }: NotebooksClientProps) {
  const [vocabularyBookWords, setVocabularyBookWords] = useState<VocabularyBookWordWithWord[]>([]);
  const [isWordsLoading, setIsWordsLoading] = useState(false);
  const [isRemovingWordId, setIsRemovingWordId] = useState<string | null>(null);
  const [updatingLearningStateWordId, setUpdatingLearningStateWordId] = useState<string | null>(null);
  const [dragOffsetByWordId, setDragOffsetByWordId] = useState<Record<string, number>>({});
  const [draggingWordId, setDraggingWordId] = useState<string | null>(null);
  const [manuallySelectedVocabularyBookId, setManuallySelectedVocabularyBookId] = useState<string | null>(null);
  const [newVocabularyBookTitle, setNewVocabularyBookTitle] = useState("");
  const [isCreatingVocabularyBook, setIsCreatingVocabularyBook] = useState(false);
  const [isCreateVocabularyBookModalOpen, setIsCreateVocabularyBookModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const vocabularyBooks = useVocabularyBookStore((state) => state.vocabularyBooks);
  const isVocabularyBooksLoading = useVocabularyBookStore((state) => state.isVocabularyBooksLoading);
  const vocabularyBookStoreErrorMessage = useVocabularyBookStore((state) => state.errorMessage);
  const loadVocabularyBooksForUser = useVocabularyBookStore((state) => state.loadVocabularyBooksForUser);
  const addVocabularyBook = useVocabularyBookStore((state) => state.addVocabularyBook);
  const updateVocabularyBookAfterWordRemoval = useVocabularyBookStore((state) => state.updateVocabularyBookAfterWordRemoval);
  const updateVocabularyBookLearningStatus = useVocabularyBookStore((state) => state.updateVocabularyBookLearningStatus);
  const pointerStartXRef = useRef<number | null>(null);
  const feedbackToastTimeoutRef = useRef<number | null>(null);

  const selectedVocabularyBookId = useMemo(() => {
    if (
      manuallySelectedVocabularyBookId &&
      vocabularyBooks.some((vocabularyBook) => vocabularyBook.id === manuallySelectedVocabularyBookId)
    ) {
      return manuallySelectedVocabularyBookId;
    }

    if (
      initialVocabularyBookId &&
      vocabularyBooks.some((vocabularyBook) => vocabularyBook.id === initialVocabularyBookId)
    ) {
      return initialVocabularyBookId;
    }

    return vocabularyBooks[0]?.id ?? null;
  }, [initialVocabularyBookId, manuallySelectedVocabularyBookId, vocabularyBooks]);

  const selectedVocabularyBook = useMemo(
    () =>
      vocabularyBooks.find(
        (vocabularyBook) => vocabularyBook.id === selectedVocabularyBookId,
      ) ?? null,
    [selectedVocabularyBookId, vocabularyBooks],
  );

  useEffect(() => {
    let isMounted = true;

    // 단어장 조회와 생성에 필요한 현재 사용자 id를 한 번만 불러옵니다.
    const loadCurrentUserId = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !user) {
        setErrorMessage(
          error
            ? `사용자 정보를 확인하지 못했습니다: ${error.message}`
            : "사용자 정보를 확인하지 못했습니다.",
        );
        return;
      }

      setCurrentUserId(user.id);
    };

    void loadCurrentUserId();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUserId) {
      void Promise.resolve().then(() => {
        void loadVocabularyBooksForUser(currentUserId);
      });
    }
  }, [currentUserId, loadVocabularyBooksForUser]);

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
    setManuallySelectedVocabularyBookId(vocabularyBookId);
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

    if (!currentUserId) {
      setFeedbackMessage("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      setIsCreatingVocabularyBook(false);
      return;
    }

    const { data, error } = await createVocabularyBookForUser(trimmedTitle, currentUserId);

    if (error) {
      setFeedbackMessage(`단어장을 만들지 못했습니다: ${error.message}`);
      setIsCreatingVocabularyBook(false);
      return;
    }

    setNewVocabularyBookTitle("");
    setManuallySelectedVocabularyBookId(data.id);
    addVocabularyBook(data);
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
    if (selectedVocabularyBookId) {
      updateVocabularyBookAfterWordRemoval(selectedVocabularyBookId, Boolean(removedVocabularyBookWord?.status));
    }
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
    const currentVocabularyBookWord = vocabularyBookWords.find(
      (vocabularyBookWord) => vocabularyBookWord.id === vocabularyBookWordId,
    );

    if (selectedVocabularyBookId) {
      updateVocabularyBookLearningStatus(
        selectedVocabularyBookId,
        Boolean(currentVocabularyBookWord?.status),
        nextStatus,
      );
    }
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

      {errorMessage || vocabularyBookStoreErrorMessage ? (
        <section className={styles.notice} role="alert">
          <strong>데이터를 불러오지 못했습니다.</strong>
          <span>{errorMessage || vocabularyBookStoreErrorMessage}</span>
        </section>
      ) : null}

      {isVocabularyBooksLoading ? (
        <div className={styles.emptyState}>내 단어장을 불러오는 중입니다...</div>
      ) : null}

      {!isVocabularyBooksLoading ? (
        <div className={styles.contentGrid}>
          <NotebookList
            onCreateVocabularyBook={handleOpenCreateVocabularyBookModal}
            onSelectVocabularyBook={handleSelectVocabularyBook}
            selectedVocabularyBookId={selectedVocabularyBookId}
            vocabularyBooks={vocabularyBooks}
          />

          <SavedWordList
            dragOffsetByWordId={dragOffsetByWordId}
            draggingWordId={draggingWordId}
            isRemovingWordId={isRemovingWordId}
            isWordsLoading={isWordsLoading}
            onPointerDown={handleWordCardPointerDown}
            onPointerEnd={handleWordCardPointerEnd}
            onPointerMove={handleWordCardPointerMove}
            onRemoveWord={handleRemoveWord}
            onToggleLearningStatus={handleToggleLearningStatus}
            selectedVocabularyBook={selectedVocabularyBook}
            updatingLearningStateWordId={updatingLearningStateWordId}
            vocabularyBookWords={vocabularyBookWords}
          />
        </div>
      ) : null}

      {isCreateVocabularyBookModalOpen ? (
        <CreateNotebookModal
          isCreatingVocabularyBook={isCreatingVocabularyBook}
          newVocabularyBookTitle={newVocabularyBookTitle}
          onClose={handleCloseCreateVocabularyBookModal}
          onCreateVocabularyBook={handleCreateVocabularyBook}
          onNewVocabularyBookTitleChange={handleNewVocabularyBookTitleChange}
        />
      ) : null}

      <NotebooksToast feedbackMessage={feedbackMessage} />
    </section>
  );
}
