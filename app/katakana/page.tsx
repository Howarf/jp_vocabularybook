import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import MobileHeader from "@/src/components/MobileHeader";
import sharedStyles from "../shared.module.css";
import styles from "./katakana.module.css";

const katakanaRows = [
  { rowName: "아행", characters: ["ア", "イ", "ウ", "エ", "オ"] },
  { rowName: "카행", characters: ["カ", "キ", "ク", "ケ", "コ"] },
  { rowName: "사행", characters: ["サ", "シ", "ス", "セ", "ソ"] },
  { rowName: "타행", characters: ["タ", "チ", "ツ", "テ", "ト"] },
  { rowName: "나행", characters: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
  { rowName: "하행", characters: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { rowName: "마행", characters: ["マ", "ミ", "ム", "メ", "モ"] },
  { rowName: "야행", characters: ["ヤ", "ユ", "ヨ"] },
  { rowName: "라행", characters: ["ラ", "リ", "ル", "レ", "ロ"] },
  { rowName: "와행", characters: ["ワ", "ヲ"] },
  { rowName: "응", characters: ["ン"] },
];

// 가타카나 50음도 정적 학습 페이지를 렌더링합니다.
export default function KatakanaPage() {
  return (
    <AuthGuard>
      <main className={sharedStyles.contentPage}>
        <MobileHeader />
        <section className={sharedStyles.contentShell} aria-labelledby="katakana-title">
          <div className={sharedStyles.heroSection}>
            <p className={sharedStyles.eyebrowText}>Kana chart</p>
            <h1 id="katakana-title" className={sharedStyles.pageTitle}>가타카나</h1>
            <p className={sharedStyles.pageDescription}>
              외래어와 의성어에 자주 쓰이는 가타카나를 행별로 익혀 보세요.
            </p>
          </div>

          <div className={styles.chart} aria-label="가타카나 50음도 표">
            {katakanaRows.map((katakanaRow) => (
              <section className={[sharedStyles.surfacePanel, styles.rowCard].join(" ")} key={katakanaRow.rowName}>
                <h2 className={styles.rowTitle}>{katakanaRow.rowName}</h2>
                <div className={styles.characterGrid}>
                  {katakanaRow.characters.map((character) => (
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
