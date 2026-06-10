import AuthGuard from "@/src/components/AuthGuard";
import AppHeader from "@/src/components/AppHeader";
import NotebooksClient from "./NotebooksClient";
import sharedStyles from "../shared.module.css";

type NotebooksPageProps = {
  searchParams: Promise<{ bookId?: string | string[] }>;
};

// 쿼리 파라미터에서 처음 열 단어장 id를 추출합니다.
function getInitialVocabularyBookId(bookId: string | string[] | undefined) {
  if (Array.isArray(bookId)) {
    return bookId[0] ?? null;
  }

  return bookId ?? null;
}

// 내 단어장 페이지를 인증 보호와 모바일 헤더를 포함해 렌더링합니다.
export default async function NotebooksPage({ searchParams }: NotebooksPageProps) {
  const { bookId } = await searchParams;
  const initialVocabularyBookId = getInitialVocabularyBookId(bookId);

  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <AppHeader />
        <NotebooksClient initialVocabularyBookId={initialVocabularyBookId} />
      </main>
    </AuthGuard>
  );
}
