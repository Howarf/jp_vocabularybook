import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import styles from "./page.module.css";

// 메인 페이지에서 단어장 진입 링크를 제공하는 홈 화면을 렌더링합니다.
export default function Home() {
  return (
    <AuthGuard>
      <main className={styles.page}>
        <section className={styles.shell} aria-label="JLPT 단어장 메인">
          <MobileHeader />

          <div className={styles.content}>
            <div className={styles.buttonGroup}>
              <Link className={styles.secondaryLink} href="/hiragana">
                히라가나
              </Link>
              <Link className={styles.secondaryLink} href="/katakana">
                가타카나
              </Link>
              <Link className={styles.primaryLink} href="/words">
                JLPT단어 보러가기
              </Link>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
