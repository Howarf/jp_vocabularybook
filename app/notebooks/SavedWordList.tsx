"use client";

import type { PointerEvent } from "react";
import type { VocabularyBookWithCount, VocabularyBookWordWithWord } from "@/src/types/vocabulary";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";
import SavedWordCard from "./SavedWordCard";

type SavedWordListProps = {
  dragOffsetByWordId: Record<string, number>;
  draggingWordId: string | null;
  isRemovingWordId: string | null;
  isWordsLoading: boolean;
  selectedVocabularyBook: VocabularyBookWithCount | null;
  updatingLearningStateWordId: string | null;
  vocabularyBookWords: VocabularyBookWordWithWord[];
  onPointerDown: (vocabularyBookWordId: string, event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (vocabularyBookWord: VocabularyBookWordWithWord, event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (vocabularyBookWordId: string, event: PointerEvent<HTMLDivElement>) => void;
  onRemoveWord: (vocabularyBookWordId: string) => void;
  onToggleLearningStatus: (vocabularyBookWord: VocabularyBookWordWithWord) => void;
};

// 선택된 단어장의 저장 단어 목록과 로딩 및 빈 상태를 렌더링합니다.
export default function SavedWordList({
  dragOffsetByWordId,
  draggingWordId,
  isRemovingWordId,
  isWordsLoading,
  selectedVocabularyBook,
  updatingLearningStateWordId,
  vocabularyBookWords,
  onPointerDown,
  onPointerEnd,
  onPointerMove,
  onRemoveWord,
  onToggleLearningStatus,
}: SavedWordListProps) {
  return (
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
          {vocabularyBookWords.map((vocabularyBookWord) => (
            <SavedWordCard
              draggingWordId={draggingWordId}
              isRemovingWordId={isRemovingWordId}
              key={vocabularyBookWord.id}
              onPointerDown={onPointerDown}
              onPointerEnd={onPointerEnd}
              onPointerMove={onPointerMove}
              onRemoveWord={onRemoveWord}
              onToggleLearningStatus={onToggleLearningStatus}
              updatingLearningStateWordId={updatingLearningStateWordId}
              vocabularyBookWord={vocabularyBookWord}
              wordCardDragOffset={dragOffsetByWordId[vocabularyBookWord.id] ?? 0}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
