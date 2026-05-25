"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import styles from "./MobileHeader.module.css";

// 메인 화면의 모바일 헤더와 햄버거 메뉴 패널을 렌더링합니다.
export default function MobileHeader() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    setIsLoggingOut(false);
    router.replace("/login");
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.logo}>JLPT단어장</h1>
      <button
        className={styles.menuButton}
        type="button"
        aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isMenuOpen}
        aria-controls="main-mobile-menu"
        onClick={handleToggleMenu}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        id="main-mobile-menu"
        className={`${styles.panel} ${isMenuOpen ? styles.openPanel : ""}`}
        aria-label="메인 메뉴"
      >
        <Link className={styles.menuLink} href="/" onClick={handleCloseMenu}>
          메인
        </Link>
        <Link className={styles.menuLink} href="/words" onClick={handleCloseMenu}>
          JLPT단어 보기
        </Link>
        <Link
          className={styles.menuLink}
          href="/notebooks"
          onClick={handleCloseMenu}
        >
          내 단어장
        </Link>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </nav>
    </header>
  );
}
