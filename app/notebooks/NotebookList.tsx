"use client";

import type { VocabularyBookWithCount } from "@/src/types/vocabulary";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

type NotebookListProps = {
  vocabularyBooks: VocabularyBookWithCount[];
  selectedVocabularyBookId: string | null;
  onCreateVocabularyBook: () => void;
  onSelectVocabularyBook: (vocabularyBookId: string) => void;
};

// 단어장 목록과 새 단어장 만들기 진입 버튼을 렌더링합니다.
export default function NotebookList({
  vocabularyBooks,
  selectedVocabularyBookId,
  onCreateVocabularyBook,
  onSelectVocabularyBook,
}: NotebookListProps) {
  return (
    <section className={[sharedStyles.surfacePanel, styles.panel].join(" ")} aria-label="내 단어장 목록">
      <div className={styles.listHeader}>
        <h2 className={sharedStyles.sectionTitle}>단어장 목록</h2>
        <button
          className={styles.createInlineButton}
          onClick={onCreateVocabularyBook}
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
              onClick={() => onSelectVocabularyBook(vocabularyBook.id)}
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
  );
}
