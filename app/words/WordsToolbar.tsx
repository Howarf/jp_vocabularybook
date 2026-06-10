"use client";

import type { ChangeEvent } from "react";
import type { JlptFilterLabel } from "@/src/utils/word";
import { jlptTagOptions } from "@/src/utils/word";
import styles from "./words.module.css";

type WordsToolbarProps = {
  searchTerm: string;
  selectedTag: JlptFilterLabel;
  isLoading: boolean;
  onSearchTermChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSelectedTagChange: (tag: JlptFilterLabel) => void;
};

// 단어 검색 입력과 JLPT 태그 필터를 렌더링합니다.
export default function WordsToolbar({
  searchTerm,
  selectedTag,
  isLoading,
  onSearchTermChange,
  onSelectedTagChange,
}: WordsToolbarProps) {
  return (
    <>
      <nav className={styles.filters} aria-label="단어 태그 필터">
        {jlptTagOptions.map((option) => (
          <button
            aria-pressed={selectedTag === option.label}
            className={`${styles.filterButton} ${selectedTag === option.label ? styles.activeFilter : ""}`}
            disabled={isLoading && selectedTag === option.label}
            key={option.label}
            onClick={() => onSelectedTagChange(option.label)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </nav>

      <section className={styles.controls} aria-label="단어 검색">
        <label className={styles.searchLabel} htmlFor="word-search-input">
          <span>단어 검색</span>
          <input
            className={styles.searchInput}
            id="word-search-input"
            onChange={onSearchTermChange}
            placeholder="단어, 읽기, 뜻을 입력하세요"
            type="search"
            value={searchTerm}
          />
        </label>
      </section>
    </>
  );
}
