"use client";

import type { ChangeEvent } from "react";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

type CreateNotebookModalProps = {
  isCreatingVocabularyBook: boolean;
  newVocabularyBookTitle: string;
  onClose: () => void;
  onCreateVocabularyBook: () => void;
  onNewVocabularyBookTitleChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

// 새 단어장 이름을 입력하고 생성을 요청하는 모달을 렌더링합니다.
export default function CreateNotebookModal({
  isCreatingVocabularyBook,
  newVocabularyBookTitle,
  onClose,
  onCreateVocabularyBook,
  onNewVocabularyBookTitleChange,
}: CreateNotebookModalProps) {
  return (
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
            onClick={onClose}
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
            onChange={onNewVocabularyBookTitleChange}
            placeholder="예: 매일 복습 단어장"
            type="text"
            value={newVocabularyBookTitle}
          />
          <div className={styles.modalActionRow}>
            <button
              className={styles.cancelButton}
              disabled={isCreatingVocabularyBook}
              onClick={onClose}
              type="button"
            >
              취소
            </button>
            <button
              className={styles.createButton}
              disabled={isCreatingVocabularyBook}
              onClick={onCreateVocabularyBook}
              type="button"
            >
              {isCreatingVocabularyBook ? "생성 중" : "생성"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
