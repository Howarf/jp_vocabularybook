// 학습 단어 수와 전체 단어 수로 학습 진행률을 계산합니다.
export function calculateLearningProgressPercentage(wordCount: number, learnedWordCount: number) {
  if (wordCount === 0) {
    return 0;
  }

  return Math.round((learnedWordCount / wordCount) * 100);
}
