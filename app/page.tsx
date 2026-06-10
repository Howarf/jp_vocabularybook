import AuthGuard from "@/src/components/AuthGuard";
import AppHeader from "@/src/components/AppHeader";
import LearningVocabularyBookSection from "./LearningVocabularyBookSection";
import QuizInsightSection from "./QuizInsightSection";
import TodayWordSection from "./TodayWordSection";
import sharedStyles from "./shared.module.css";
import styles from "./page.module.css";

// 메인 페이지에서 오늘의 단어, 학습중인 단어장, 퀴즈 복습 요약을 렌더링합니다.
export default function Home() {
  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <AppHeader />
        <section className={sharedStyles.contentShell} aria-labelledby="home-title">
          <p className={sharedStyles.eyebrowText}>Study dashboard</p>
          <h1 id="home-title" className={sharedStyles.pageTitle}>
            일본어 학습 홈
          </h1>
          <p className={sharedStyles.pageDescription}>
            오늘 학습할 단어와 단어장 진행도, 퀴즈 복습 정보를 한눈에 확인하세요.
          </p>

          <div className={styles.content}>
            <div className={styles.contentGrid}>
              <div className={styles.shortContentColumn}>
                <TodayWordSection />
                <QuizInsightSection />
              </div>

              <div className={styles.longContentColumn}>
                <LearningVocabularyBookSection />
              </div>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
