"use client";

import type { ChangeEvent } from "react";
import type { VocabularyBook } from "@/src/types/vocabulary";
import sharedStyles from "../shared.module.css";
import type { SelectedWord } from "./WordList";
import styles from "./words.module.css";

type NotebookAddModalProps = {
  selectedWord: SelectedWord;
  vocabularyBooks: VocabularyBook[];
  newVocabularyBookTitle: string;
  isVocabularyBookLoading: boolean;
  isVocabularyBookSubmitting: boolean;
  feedbackMessage: string;
  onClose: () => void;
  onNewVocabularyBookTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCreateVocabularyBook: () => void;
  onSelectVocabularyBook: (vocabularyBook: VocabularyBook) => void;
};

// 선택한 단어를 단어장에 추가하기 위한 단어장 선택 및 생성 모달을 렌더링합니다.
export default function NotebookAddModal({
  selectedWord,
  vocabularyBooks,
  newVocabularyBookTitle,
  isVocabularyBookLoading,
  isVocabularyBookSubmitting,
  feedbackMessage,
  onClose,
  onNewVocabularyBookTitleChange,
  onCreateVocabularyBook,
  onSelectVocabularyBook,
}: NotebookAddModalProps) {
  return (
    <div className={[sharedStyles.modalBackdrop, styles.modalBackdrop].join(" ")} role="presentation">
      <section
        aria-labelledby="notebook-modal-title"
        aria-modal="true"
        className={styles.modalCard}
        role="dialog"
      >
        <div className={[sharedStyles.modalHeader, styles.modalHeader].join(" ")}>
          <div>
            <p className={[sharedStyles.modalEyebrow, styles.modalEyebrow].join(" ")}>Add to vocabulary book</p>
            <h2 id="notebook-modal-title" className={[sharedStyles.modalTitle, styles.modalTitle].join(" ")}>
              단어장 선택
            </h2>
          </div>
          <button
            aria-label="단어장 선택 팝업 닫기"
            className={[sharedStyles.modalCloseButton, styles.closeButton].join(" ")}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <p className={styles.selectedWordText}>
          <strong>{selectedWord.word}</strong>
          {selectedWord.reading !== "-" ? <span>{selectedWord.reading}</span> : null}
        </p>

        <div className={styles.createNotebookBox}>
          <label className={styles.createNotebookLabel} htmlFor="new-notebook-name">
            새 단어장 만들기
          </label>
          <div className={styles.createNotebookRow}>
            <input
              className={styles.createNotebookInput}
              id="new-notebook-name"
              onChange={onNewVocabularyBookTitleChange}
              placeholder="예: 매일 복습 단어장"
              type="text"
              value={newVocabularyBookTitle}
            />
            <button
              className={styles.createNotebookButton}
              disabled={isVocabularyBookSubmitting}
              onClick={onCreateVocabularyBook}
              type="button"
            >
              {isVocabularyBookSubmitting ? "처리 중..." : "새 단어장 만들기"}
            </button>
          </div>
        </div>

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
                onClick={() => onSelectVocabularyBook(vocabularyBook)}
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

        {feedbackMessage ? <p className={styles.modalFeedback}>{feedbackMessage}</p> : null}
      </section>
    </div>
  );
}
