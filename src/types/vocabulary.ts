export type WordRow = Record<string, unknown> & {
  id: number;
  expression: string;
  reading: string | null;
  meaning_ko: string;
  meaning_en: string | null;
  tag: string | null;
};

export type VocabularyBook = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type VocabularyBookWithCount = VocabularyBook & {
  wordCount: number;
};

export type VocabularyBookWord = {
  id: string;
  book_id: string;
  word_id: number;
  status: boolean | null;
  correct_count: number | null;
  wrong_count: number | null;
  created_at: string;
};

export type VocabularyBookWordWithWord = VocabularyBookWord & {
  words: WordRow | WordRow[] | null;
};
