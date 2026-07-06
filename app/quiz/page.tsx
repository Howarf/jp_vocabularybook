import AuthGuard from "@/src/components/AuthGuard";
import QuizClient from "./QuizClient";

type QuizPageProps = {
  searchParams: Promise<{ bookId?: string | string[] }>;
};

// 쿼리 문자열에서 초기 단어장 id를 안전하게 가져옵니다.
function getInitialVocabularyBookId(bookId: string | string[] | undefined) {
  return Array.isArray(bookId) ? bookId[0] ?? null : bookId ?? null;
}

// 퀴즈 페이지를 인증 보호 안에서 렌더링합니다.
export default async function QuizPage({ searchParams }: QuizPageProps) {
  const { bookId } = await searchParams;
  const initialVocabularyBookId = getInitialVocabularyBookId(bookId);

  return (
    <AuthGuard>
      <QuizClient initialVocabularyBookId={initialVocabularyBookId} />
    </AuthGuard>
  );
}
