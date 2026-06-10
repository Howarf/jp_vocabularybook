import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import AppHeader from "@/src/components/AppHeader";
import sharedStyles from "../shared.module.css";
import styles from "./hiragana.module.css";

const hiraganaRows = [
  { rowName: "아행", characters: ["あ", "い", "う", "え", "お"] },
  { rowName: "카행", characters: ["か", "き", "く", "け", "こ"] },
  { rowName: "사행", characters: ["さ", "し", "す", "せ", "そ"] },
  { rowName: "타행", characters: ["た", "ち", "つ", "て", "と"] },
  { rowName: "나행", characters: ["な", "に", "ぬ", "ね", "の"] },
  { rowName: "하행", characters: ["は", "ひ", "ふ", "へ", "ほ"] },
  { rowName: "마행", characters: ["ま", "み", "む", "め", "も"] },
  { rowName: "야행", characters: ["や", "ゆ", "よ"] },
  { rowName: "라행", characters: ["ら", "り", "る", "れ", "ろ"] },
  { rowName: "와행", characters: ["わ", "を"] },
  { rowName: "응", characters: ["ん"] },
];

// 히라가나 50음도 정적 학습 페이지를 렌더링합니다.
export default function HiraganaPage() {
  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <AppHeader />
        <section className={sharedStyles.contentShell} aria-labelledby="hiragana-title">
          <div className={sharedStyles.heroSection}>
            <p className={sharedStyles.eyebrowText}>Kana chart</p>
            <h1 id="hiragana-title" className={sharedStyles.pageTitle}>히라가나</h1>
            <p className={sharedStyles.pageDescription}>
              50음도 순서에 맞춰 아행부터 차근차근 확인해 보세요.
            </p>
          </div>

          <div className={styles.chart} aria-label="히라가나 50음도 표">
            {hiraganaRows.map((hiraganaRow) => (
              <section className={[sharedStyles.surfacePanel, styles.rowCard].join(" ")} key={hiraganaRow.rowName}>
                <h2 className={styles.rowTitle}>{hiraganaRow.rowName}</h2>
                <div className={styles.characterGrid}>
                  {hiraganaRow.characters.map((character) => (
                    <span className={styles.characterCard} key={character}>{character}</span>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Link className={styles.backLink} href="/">
            메인으로 돌아가기
          </Link>
        </section>
      </main>
    </AuthGuard>
  );
}
