import { supabase } from "@/src/lib/supabaseClient";

const vocabularyBookSelectColumns = "id,user_id,title,description,created_at,updated_at";

// 입력한 제목과 사용자 id로 새 단어장을 생성하고 생성된 단어장 행을 반환합니다.
export async function createVocabularyBookForUser(title: string, description: string | null, userId: string) {
  return supabase
    .from("vocabulary_books")
    .insert({ description, title, user_id: userId })
    .select(vocabularyBookSelectColumns)
    .single();
}
