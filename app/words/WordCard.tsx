"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useRef, useState } from "react";
import styles from "./words.module.css";

type WordCardProps = {
  index: number;
  word: string;
  reading: string;
  koreanMeaning: string;
  englishMeaning: string;
  tag: string;
  onAddToNotebook: () => void;
};

// 단어 정보와 스와이프 추가 동작을 제공하는 단어 카드를 렌더링합니다.
export default function WordCard({
  index,
  word,
  reading,
  koreanMeaning,
  englishMeaning,
  tag,
  onAddToNotebook,
}: WordCardProps) {
  const [isEnglishMeaning, setIsEnglishMeaning] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartXRef = useRef<number | null>(null);
  const hasEnglishMeaning = englishMeaning !== "-";
  const meaning = isEnglishMeaning && hasEnglishMeaning ? englishMeaning : koreanMeaning;
  const revealWidth = Math.abs(dragOffset);
  const swipeCardStyle = {
    "--slide-reveal": `${revealWidth}px`,
  } as CSSProperties;

  // 포인터 드래그 시작 위치를 저장하고 카드 드래그 상태를 활성화합니다.
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  // 포인터 이동 거리에 따라 카드의 가로 드래그 위치를 갱신합니다.
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current === null) {
      return;
    }

    const diff = event.clientX - pointerStartXRef.current;
    setDragOffset(Math.min(0, Math.max(diff, -56)));
  };

  // 포인터 드래그 종료 시 단어장 추가 여부를 판단하고 드래그 상태를 초기화합니다.
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current === null) {
      return;
    }

    if (dragOffset <= -36) {
      onAddToNotebook();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <li className={styles.item}>
      <div className={styles.slideAction} aria-hidden="true">
        단어장에 추가
      </div>
      <div
        className={styles.swipeCard}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerEnd}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        data-dragging={isDragging}
        style={swipeCardStyle}
      >
        <div className={styles.topRow}>
          <span className={styles.index}>{index}</span>
          <div className={styles.actionRow}>
            <button
              className={styles.meaningToggle}
              disabled={!hasEnglishMeaning}
              onClick={() => setIsEnglishMeaning((current) => !current)}
              type="button"
            >
              뜻 전환
            </button>
          </div>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.wordRow}>
            <span className={styles.wordText}>{word}</span>
            <span className={styles.readingText}>{reading}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.meaningText}>{meaning}</span>
            <span className={styles.tagText}>{tag}</span>
          </div>
        </div>
      </div>
    </li>
  );
}
