"use client";

import type { CSSProperties, PointerEvent } from "react";
import type { VocabularyBookWordWithWord } from "@/src/types/vocabulary";
import {
  formatWordPartOfSpeech,
  normalizeJoinedWord,
  pickWordDisplayValue,
  wordExpressionFields,
  wordKoreanMeaningFields,
  wordReadingFields,
  wordTagFields,
} from "@/src/utils/word";
import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

type SavedWordCardProps = {
  draggingWordId: string | null;
  isRemovingWordId: string | null;
  updatingLearningStateWordId: string | null;
  vocabularyBookWord: VocabularyBookWordWithWord;
  wordCardDragOffset: number;
  onPointerDown: (vocabularyBookWordId: string, event: PointerEvent<HTMLDivElement>) => void;
  onPointerEnd: (vocabularyBookWord: VocabularyBookWordWithWord, event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (vocabularyBookWordId: string, event: PointerEvent<HTMLDivElement>) => void;
  onRemoveWord: (vocabularyBookWordId: string) => void;
  onToggleLearningStatus: (vocabularyBookWord: VocabularyBookWordWithWord) => void;
};

// 저장 단어 연결 데이터에서 카드에 표시할 문구와 상태값을 구성합니다.
function getSavedWordCardDisplayValues(vocabularyBookWord: VocabularyBookWordWithWord) {
  const word = normalizeJoinedWord(vocabularyBookWord.words);
  const wordText = word ? pickWordDisplayValue(word, wordExpressionFields) : "삭제되었거나 찾을 수 없는 단어";
  const readingText = word ? pickWordDisplayValue(word, wordReadingFields) : "-";
  const meaningText = word ? pickWordDisplayValue(word, wordKoreanMeaningFields) : "원본 words 데이터를 확인해 주세요.";
  const partOfSpeechText = word ? formatWordPartOfSpeech(word.part_of_speech) : "";
  const tagText = word ? pickWordDisplayValue(word, wordTagFields) : "-";
  const isMemorized = Boolean(vocabularyBookWord.status);
  const correctCount = vocabularyBookWord.correct_count ?? 0;
  const wrongCount = vocabularyBookWord.wrong_count ?? 0;
  const nextLearningStatusText = isMemorized ? "학습 중으로 변경" : "외움으로 변경";

  return {
    correctCount,
    isMemorized,
    meaningText,
    nextLearningStatusText,
    partOfSpeechText,
    readingText,
    tagText,
    wordText,
    wrongCount,
  };
}

// 저장 단어 하나의 슬라이드 액션, 삭제 버튼, 학습 상태 정보를 렌더링합니다.
export default function SavedWordCard({
  draggingWordId,
  isRemovingWordId,
  updatingLearningStateWordId,
  vocabularyBookWord,
  wordCardDragOffset,
  onPointerDown,
  onPointerEnd,
  onPointerMove,
  onRemoveWord,
  onToggleLearningStatus,
}: SavedWordCardProps) {
  const {
    correctCount,
    isMemorized,
    meaningText,
    nextLearningStatusText,
    partOfSpeechText,
    readingText,
    tagText,
    wordText,
    wrongCount,
  } = getSavedWordCardDisplayValues(vocabularyBookWord);
  const isLearningStateUpdating = updatingLearningStateWordId === vocabularyBookWord.id;
  const isWordRemoving = isRemovingWordId === vocabularyBookWord.id;
  const wordCardRevealWidth = Math.abs(wordCardDragOffset);
  const swipeWordCardStyle = {
    "--slide-reveal": `${wordCardRevealWidth}px`,
  } as CSSProperties;

  return (
    <li className={styles.wordCard}>
      <button
        aria-label={`${wordText} 상태를 ${nextLearningStatusText}`}
        className={styles.slideActionButton}
        disabled={isLearningStateUpdating || isWordRemoving}
        onClick={() => onToggleLearningStatus(vocabularyBookWord)}
        type="button"
      >
        {isLearningStateUpdating ? "변경 중" : nextLearningStatusText}
      </button>
      <div
        className={styles.swipeWordCard}
        data-dragging={draggingWordId === vocabularyBookWord.id}
        onPointerCancel={(event) => onPointerEnd(vocabularyBookWord, event)}
        onPointerDown={(event) => onPointerDown(vocabularyBookWord.id, event)}
        onPointerLeave={(event) => onPointerEnd(vocabularyBookWord, event)}
        onPointerMove={(event) => onPointerMove(vocabularyBookWord.id, event)}
        onPointerUp={(event) => onPointerEnd(vocabularyBookWord, event)}
        style={swipeWordCardStyle}
      >
        <div className={styles.wordTopRow}>
          <div className={styles.wordTitleRow}>
            <strong>{wordText}</strong>
            {readingText !== "-" && readingText !== wordText && <span>{readingText}</span>}
          </div>
          <button
            className={styles.removeButton}
            disabled={isWordRemoving || isLearningStateUpdating}
            onClick={() => onRemoveWord(vocabularyBookWord.id)}
            type="button"
          >
            {isWordRemoving ? "제거 중" : "제거"}
          </button>
        </div>
        <div className={styles.wordMeaningRow}>
          <p>{meaningText}</p>
          <div className={styles.wordMetaBadgeRow}>
            {partOfSpeechText ? <small className={styles.wordPartOfSpeechBadge}>{partOfSpeechText}</small> : null}
            {tagText !== "-" ? <small>{tagText}</small> : null}
          </div>
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
}
