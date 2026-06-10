import HeaderMenuButton from "./HeaderMenuButton";
import styles from "./AppHeader.module.css";

// 애플리케이션 헤더의 정적 영역과 클라이언트 메뉴 버튼을 렌더링합니다.
export default function AppHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.logo}>JLPT단어장</h1>
      <HeaderMenuButton />
    </header>
  );
}
