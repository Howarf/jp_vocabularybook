import AuthGuard from "@/src/components/AuthGuard";
import WordsClient from "./WordsClient";

export default function WordsPage() {

  return (
    <AuthGuard>
      <WordsClient />
    </AuthGuard>
  );
}
