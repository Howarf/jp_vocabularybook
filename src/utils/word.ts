import type { WordRow } from "@/src/types/database";

export type JlptFilterLabel = "전체" | "N5" | "N4" | "N3" | "N2";
export type WordDisplayField = keyof Pick<WordRow, "expression" | "reading" | "meaning_ko" | "meaning_en" | "tag">;

export const jlptTagOptions: { label: JlptFilterLabel; dbValue?: string }[] = [
  { label: "전체" },
  { label: "N5", dbValue: "JLPT_N5" },
  { label: "N4", dbValue: "JLPT_N4" },
  { label: "N3", dbValue: "JLPT_N3" },
  { label: "N2", dbValue: "JLPT_N2" },
];
export const wordExpressionFields = ["expression"] as const satisfies readonly WordDisplayField[];
export const wordReadingFields = ["reading"] as const satisfies readonly WordDisplayField[];
export const wordKoreanMeaningFields = ["meaning_ko"] as const satisfies readonly WordDisplayField[];
export const wordEnglishMeaningFields = ["meaning_en"] as const satisfies readonly WordDisplayField[];
export const wordTagFields = ["tag"] as const satisfies readonly WordDisplayField[];

// 화면에 표시할 수 없는 단어 필드 값을 대체 문자열로 변환합니다.
export function formatWordDisplayValue(value: WordRow[WordDisplayField] | undefined) {
  if (value === null || value === undefined) return "-";
  return String(value);
}

// 단어 행에서 지정한 필드 후보 중 첫 번째 유효한 표시 값을 반환합니다.
export function pickWordDisplayValue(row: WordRow, fields: readonly WordDisplayField[]) {
  const matchedField = fields.find((field) => row[field] !== null && row[field] !== undefined);
  return formatWordDisplayValue(matchedField ? row[matchedField] : undefined);
}

// 선택한 JLPT 필터 라벨에 대응하는 데이터베이스 태그 값을 반환합니다.
export function getJlptDatabaseTag(label: JlptFilterLabel) {
  return jlptTagOptions.find((option) => option.label === label)?.dbValue;
}

// Supabase 검색 조건에 사용할 수 있도록 검색어의 위험 문자를 정리합니다.
export function sanitizeWordSearchTerm(searchTerm: string) {
  return searchTerm.trim().replace(/[,%()*\\]/g, " ").replace(/\s+/g, " ").slice(0, 80);
}

// 조인 결과의 words 값을 단일 단어 행으로 정규화합니다.
export function normalizeJoinedWord(words: WordRow | WordRow[] | null) {
  if (Array.isArray(words)) return words[0] ?? null;
  return words;
}
