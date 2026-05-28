import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import NotebooksClient from "./NotebooksClient";
import sharedStyles from "../shared.module.css";

// 내 단어장 페이지를 인증 보호와 모바일 헤더를 포함해 렌더링합니다.
export default function NotebooksPage() {
  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <MobileHeader />
        <NotebooksClient />
      </main>
    </AuthGuard>
  );
}
