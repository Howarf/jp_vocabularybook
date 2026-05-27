export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; created_at: string | null; updated_at: string | null };
        Insert: { id?: string; display_name: string; created_at?: string | null; updated_at?: string | null };
        Update: { id?: string; display_name?: string; created_at?: string | null; updated_at?: string | null };
        Relationships: [];
      };
      vocabulary_books: {
        Row: { id: string; user_id: string; title: string; description: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; description?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; user_id?: string; title?: string; description?: string | null; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "vocabulary_books_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      vocabulary_book_words: {
        Row: { id: string; book_id: string; word_id: number; status: boolean | null; correct_count: number | null; wrong_count: number | null; created_at: string | null };
        Insert: { id?: string; book_id: string; word_id: number; status?: boolean | null; correct_count?: number | null; wrong_count?: number | null; created_at?: string | null };
        Update: { id?: string; book_id?: string; word_id?: number; status?: boolean | null; correct_count?: number | null; wrong_count?: number | null; created_at?: string | null };
        Relationships: [
          { foreignKeyName: "vocabulary_book_words_book_id_fkey"; columns: ["book_id"]; isOneToOne: false; referencedRelation: "vocabulary_books"; referencedColumns: ["id"] },
          { foreignKeyName: "vocabulary_book_words_word_id_fkey"; columns: ["word_id"]; isOneToOne: false; referencedRelation: "words"; referencedColumns: ["id"] },
        ];
      };
      words: {
        Row: { id: number; expression: string; reading: string | null; meaning_ko: string; meaning_en: string | null; tag: string | null };
        Insert: { id?: never; expression: string; reading?: string | null; meaning_ko: string; meaning_en?: string | null; tag?: string | null };
        Update: { id?: never; expression?: string; reading?: string | null; meaning_ko?: string; meaning_en?: string | null; tag?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type WordRow = Database["public"]["Tables"]["words"]["Row"];
export type WordInsert = Database["public"]["Tables"]["words"]["Insert"];
export type WordUpdate = Database["public"]["Tables"]["words"]["Update"];
export type VocabularyBookRow = Database["public"]["Tables"]["vocabulary_books"]["Row"];
export type VocabularyBookInsert = Database["public"]["Tables"]["vocabulary_books"]["Insert"];
export type VocabularyBookUpdate = Database["public"]["Tables"]["vocabulary_books"]["Update"];
export type VocabularyBookWordRow = Database["public"]["Tables"]["vocabulary_book_words"]["Row"];
export type VocabularyBookWordInsert = Database["public"]["Tables"]["vocabulary_book_words"]["Insert"];
export type VocabularyBookWordUpdate = Database["public"]["Tables"]["vocabulary_book_words"]["Update"];

export type VocabularyBookWithCount = VocabularyBookRow & { wordCount: number; learnedWordCount: number; learningProgressPercentage: number };
export type VocabularyBookWithLearningRows = VocabularyBookRow & { vocabulary_book_words?: Pick<VocabularyBookWordRow, "status">[] | null };
export type VocabularyBookWordWithWord = VocabularyBookWordRow & { words: WordRow | WordRow[] | null };
