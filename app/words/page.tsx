import Link from "next/link";
import { isSupabaseConfigured } from "@/src/lib/supabaseClient";
import WordsClient from "./WordsClient";
import styles from "./words.module.css";

// Supabase 설정 상태에 따라 단어 목록 화면 또는 설정 안내 화면을 렌더링합니다.
export default function WordsPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="words-title">
          <p className={styles.eyebrow}>Configuration required</p>
          <h1 id="words-title" className={styles.title}>
            Supabase URL 설정이 필요합니다
          </h1>
          <p className={styles.description}>
            <code>NEXT_PUBLIC_SUPABASE_URL</code> 환경변수에 Supabase 프로젝트
            URL을 입력한 뒤 개발 서버를 다시 실행해 주세요.
          </p>
          <Link className={styles.linkButton} href="/">
            홈으로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  return <WordsClient />;
}
