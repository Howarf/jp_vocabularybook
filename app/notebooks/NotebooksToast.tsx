import sharedStyles from "../shared.module.css";
import styles from "./notebooks.module.css";

type NotebooksToastProps = {
  feedbackMessage: string;
};

// 단어장 화면의 사용자 피드백 메시지를 토스트로 표시합니다.
export default function NotebooksToast({ feedbackMessage }: NotebooksToastProps) {
  if (!feedbackMessage) {
    return null;
  }

  return (
    <section className={[sharedStyles.toastMessage, styles.feedbackToast].join(" ")} role="status">
      {feedbackMessage}
    </section>
  );
}
