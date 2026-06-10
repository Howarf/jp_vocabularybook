"use client";

import { useEffect } from "react";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";

type VocabularyBookPreloaderProps = {
  userId: string;
};

// 인증된 사용자의 단어장 목록을 보호 페이지 진입 시 전역 상태로 미리 불러옵니다.
export default function VocabularyBookPreloader({ userId }: VocabularyBookPreloaderProps) {
  const loadVocabularyBooksForUser = useVocabularyBookStore(
    (state) => state.loadVocabularyBooksForUser,
  );

  useEffect(() => {
    void loadVocabularyBooksForUser(userId);
  }, [loadVocabularyBooksForUser, userId]);

  return null;
}
