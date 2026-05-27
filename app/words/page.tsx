import AuthGuard from "@/src/components/AuthGuard";
import WordsClient from "./WordsClient";

// 전체 단어 목록 페이지를 인증 보호와 함께 렌더링합니다.
export default function WordsPage() {
  return (
    <AuthGuard>
      <WordsClient />
    </AuthGuard>
  );
}
