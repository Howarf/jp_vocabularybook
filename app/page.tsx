import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import sharedStyles from "./shared.module.css";
import styles from "./page.module.css";

const featureCards = [
  {
    title: "JLPT 단어",
    description: "레벨별 핵심 단어를 빠르게 확인하고 내 단어장에 저장하세요.",
    href: "/words",
    badge: "Words",
    metadata: "1,240개 단어",
  },
  {
    title: "내 단어장",
    description: "저장한 단어를 모아 보고 외움 상태를 이어서 관리하세요.",
    href: "/notebooks",
    badge: "Books",
    metadata: "4개 단어장",
  },
  {
    title: "히라가나",
    description: "기본 문자와 발음을 카드처럼 반복해서 익혀 보세요.",
    href: "/hiragana",
    badge: "Kana",
    metadata: "46자 학습",
  },
  {
    title: "가타카나",
    description: "외래어 표기에 자주 쓰이는 문자를 단계별로 확인하세요.",
    href: "/katakana",
    badge: "Kana",
    metadata: "46자 학습",
  },
];

const learningProgressCards = [
  {
    title: "JLPT N5 기본 단어장",
    description: "인사, 시간, 장소 표현 위주로 복습 중입니다.",
    learnedCount: 42,
    totalCount: 60,
    progressPercentage: 70,
    status: "복습 중",
  },
  {
    title: "매일 헷갈리는 단어",
    description: "틀린 횟수가 많은 단어를 다시 정리해 둔 mock 단어장입니다.",
    learnedCount: 18,
    totalCount: 35,
    progressPercentage: 51,
    status: "학습 중",
  },
];

// 메인 페이지에서 단어장 디자인을 따른 정적 학습 요약과 추천 학습 카드를 렌더링합니다.
export default function Home() {
  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <MobileHeader />
        <section className={sharedStyles.contentShell} aria-labelledby="home-title">
          <p className={sharedStyles.eyebrowText}>Study dashboard</p>
          <h1 id="home-title" className={sharedStyles.pageTitle}>
            일본어 학습 홈
          </h1>
          <p className={sharedStyles.pageDescription}>
            오늘 학습할 단어와 문자 학습 메뉴를 단어장 카드처럼 한눈에 확인하세요.
          </p>

          <div className={styles.content}>
            <div className={styles.contentGrid}>
              <div className={styles.shortContentColumn}>
                <section className={[sharedStyles.surfacePanel, styles.summaryPanel].join(" ")} aria-label="오늘의 학습 요약">
                  <div className={styles.summaryHeader}>
                    <div>
                      <p className={sharedStyles.selectedLabel}>오늘의 학습 요약</p>
                      <h2 className={sharedStyles.sectionTitle}>가볍게 이어가는 복습</h2>
                    </div>
                    <span className={sharedStyles.countBadge}>Mock</span>
                  </div>
                  <div className={styles.summaryMetricGrid}>
                    <div className={styles.metricCard}>
                      <strong>24개</strong>
                      <span>오늘 추천 단어</span>
                    </div>
                    <div className={styles.metricCard}>
                      <strong>12분</strong>
                      <span>예상 학습 시간</span>
                    </div>
                  </div>
                  <div className={sharedStyles.learningStatePanel}>
                    <div className={styles.learningStateHeader}>
                      <span className={`${sharedStyles.statusBadge} ${sharedStyles.learningBadge}`}>학습 중</span>
                      <span className={sharedStyles.answerCountText}>정답 18회 · 오답 4회</span>
                    </div>
                  </div>
                </section>

                <section className={[sharedStyles.surfacePanel, styles.panel].join(" ")} aria-label="추천 기능 목록">
                  <div className={styles.listHeader}>
                    <h2 className={sharedStyles.sectionTitle}>추천 학습 메뉴</h2>
                    <span className={sharedStyles.countBadge}>4개</span>
                  </div>
                  <ul className={[sharedStyles.responsiveList, styles.list].join(" ")}>
                    {featureCards.map((featureCard) => (
                      <li className={styles.card} key={featureCard.href}>
                        <Link className={[sharedStyles.interactiveCardButton, styles.cardButton].join(" ")} href={featureCard.href}>
                          <div className={styles.cardTitleRow}>
                            <strong>{featureCard.title}</strong>
                            <small>{featureCard.metadata}</small>
                          </div>
                          <span>{featureCard.description}</span>
                          <em>{featureCard.badge}</em>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section className={[sharedStyles.surfacePanel, styles.panel, styles.longContentPanel].join(" ")} aria-label="학습률 mock 카드">
                <div className={styles.listHeader}>
                  <h2 className={sharedStyles.sectionTitle}>학습률 미리보기</h2>
                  <span className={sharedStyles.countBadge}>진행률</span>
                </div>
                <ul className={[sharedStyles.responsiveList, styles.progressList].join(" ")}>
                  {learningProgressCards.map((learningProgressCard) => (
                    <li className={styles.progressCard} key={learningProgressCard.title}>
                      <div className={styles.cardTitleRow}>
                        <strong>{learningProgressCard.title}</strong>
                        <small>
                          {learningProgressCard.learnedCount} / {learningProgressCard.totalCount}개 학습 · {learningProgressCard.progressPercentage}%
                        </small>
                      </div>
                      <span>{learningProgressCard.description}</span>
                      <div className={styles.progressMetaRow}>
                        <span className={`${sharedStyles.statusBadge} ${sharedStyles.memorizedBadge}`}>
                          {learningProgressCard.status}
                        </span>
                        <span className={sharedStyles.answerCountText}>mock progress</span>
                      </div>
                      <div className={styles.progressTrack} aria-hidden="true">
                        <div
                          className={styles.progressBar}
                          style={{ width: `${learningProgressCard.progressPercentage}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
