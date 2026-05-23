import Link from "next/link";
import styles from "./page.module.css";

// 메인 페이지에서 단어장 진입 링크를 제공하는 홈 화면을 렌더링합니다.
export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.shell} aria-label="JLPT 단어장 메인">
        <header className={styles.header}>
          <h1 className={styles.logo}>JLPT단어장</h1>
          <button className={styles.menuButton} type="button" aria-label="메뉴 열기">
            <span />
            <span />
            <span />
          </button>
        </header>

        <div className={styles.content}>
          <Link className={styles.primaryLink} href="/words">
            JLPT단어 보러가기
          </Link>
        </div>
      </section>
    </main>
  );
}
