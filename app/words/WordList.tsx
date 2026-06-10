"use client";

import type { RefObject } from "react";
import type { WordRow } from "@/src/types/vocabulary";
import {
  pickWordDisplayValue,
  wordEnglishMeaningFields,
  wordExpressionFields,
  wordKoreanMeaningFields,
  wordReadingFields,
  wordTagFields,
} from "@/src/utils/word";
import WordCard from "./WordCard";
import styles from "./words.module.css";

export type SelectedWord = {
  id: number;
  word: string;
  reading: string;
};

type WordListProps = {
  words: WordRow[];
  isLoading: boolean;
  hasMore: boolean;
  errorMessage: string;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onAddToNotebook: (word: SelectedWord) => void;
  onInvalidWordId: () => void;
};

// 단어 목록과 목록 상태 메시지를 렌더링합니다.
export default function WordList({
  words,
  isLoading,
  hasMore,
  errorMessage,
  sentinelRef,
  onAddToNotebook,
  onInvalidWordId,
}: WordListProps) {
  return (
    <>
      {errorMessage ? (
        <section className={styles.notice} role="alert">
          <strong>단어를 불러오지 못했습니다.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {!errorMessage && !isLoading && words.length === 0 ? (
        <section className={styles.notice}>
          <strong>검색 결과가 없습니다.</strong>
          <span>검색어 또는 선택한 태그에 해당하는 단어가 없습니다.</span>
        </section>
      ) : null}

      <ul className={styles.list}>
        {words.map((word, index) => {
          const wordValue = pickWordDisplayValue(word, wordExpressionFields);
          const readingValue = pickWordDisplayValue(word, wordReadingFields);
          const koreanMeaningValue = pickWordDisplayValue(word, wordKoreanMeaningFields);
          const englishMeaningValue = pickWordDisplayValue(word, wordEnglishMeaningFields);
          const tagValue = pickWordDisplayValue(word, wordTagFields);
          const wordId = word.id;

          return (
            <WordCard
              englishMeaning={englishMeaningValue}
              index={index + 1}
              key={String(word.id ?? `${wordValue}-${index}`)}
              koreanMeaning={koreanMeaningValue}
              onAddToNotebook={() =>
                typeof wordId !== "number"
                  ? onInvalidWordId()
                  : onAddToNotebook({
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
    </>
  );
}
