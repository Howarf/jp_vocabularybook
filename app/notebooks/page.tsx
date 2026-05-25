import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import NotebooksClient from "./NotebooksClient";
import styles from "./notebooks.module.css";

// 로그인한 사용자에게 실제 DB 기반 내 단어장 페이지를 렌더링합니다.
export default function NotebooksPage() {
  return (
    <AuthGuard>
      <main className={styles.page}>
        <MobileHeader />
        <NotebooksClient />
      </main>
    </AuthGuard>
  );
}
