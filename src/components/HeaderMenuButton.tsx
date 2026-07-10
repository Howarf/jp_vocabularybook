"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import { useVocabularyBookStore } from "@/src/stores/useVocabularyBookStore";
import styles from "./AppHeader.module.css";

// 헤더의 햄버거 버튼과 메뉴 패널을 렌더링합니다.
export default function HeaderMenuButton() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const resetVocabularyBookState = useVocabularyBookStore((state) => state.resetVocabularyBookState);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handleDocumentPointerDown = (event: globalThis.PointerEvent) => {
      if (menuContainerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isMenuOpen]);

  // 햄버거 메뉴 패널의 열림 상태를 반대로 변경합니다.
  const handleToggleMenu = () => {
    setIsMenuOpen((currentIsMenuOpen) => !currentIsMenuOpen);
  };

  // 메뉴 항목 선택 후 햄버거 메뉴 패널을 닫습니다.
  const handleCloseMenu = () => {
    setIsMenuOpen(false);
  };

  // Supabase 인증 세션을 종료하고 로그인 페이지로 이동합니다.
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    resetVocabularyBookState();
    setIsLoggingOut(false);
    router.replace("/login");
  };

  return (
    <div className={styles.menuContainer} ref={menuContainerRef}>
      <button
        aria-controls="main-mobile-menu"
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        className={styles.menuButton}
        type="button"
        onClick={handleToggleMenu}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        aria-label="메인 메뉴"
        className={`${styles.panel} ${isMenuOpen ? styles.openPanel : ""}`}
        id="main-mobile-menu"
      >
        <Link className={styles.menuLink} href="/" onClick={handleCloseMenu}>
          메인
        </Link>
        <Link className={styles.menuLink} href="/words" onClick={handleCloseMenu}>
          JLPT 단어 보기
        </Link>
        <Link className={styles.menuLink} href="/notebooks" onClick={handleCloseMenu}>
          내 단어장
        </Link>
        <Link className={styles.menuLink} href="/quiz" onClick={handleCloseMenu}>
          퀴즈
        </Link>
        <Link className={styles.menuLink} href="/hiragana" onClick={handleCloseMenu}>
          히라가나
        </Link>
        <Link className={styles.menuLink} href="/katakana" onClick={handleCloseMenu}>
          가타카나
        </Link>
        <button
          className={styles.logoutButton}
          disabled={isLoggingOut}
          type="button"
          onClick={handleLogout}
        >
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </nav>
    </div>
  );
}
