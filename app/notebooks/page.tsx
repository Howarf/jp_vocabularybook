import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import NotebooksClient from "./NotebooksClient";
import styles from "./notebooks.module.css";

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
