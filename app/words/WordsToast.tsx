import sharedStyles from "../shared.module.css";
import styles from "./words.module.css";

type WordsToastProps = {
  message: string;
};

// 단어장 추가 결과를 알리는 토스트 메시지를 렌더링합니다.
export default function WordsToast({ message }: WordsToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className={[sharedStyles.toastMessage, styles.toast].join(" ")} role="status">
      {message}
    </div>
  );
}
