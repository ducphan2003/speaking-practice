/** Chuẩn hóa từ/cụm để khóa tra trong `system_vocabularies`. */
export function vocabularyWordKey(word: string): string {
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}
