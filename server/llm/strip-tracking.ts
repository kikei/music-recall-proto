// Strip the utm_source tracking parameter that web-search citation URLs carry
// in LLM output. Don't re-serialize the URL; just remove that part as a string.
export function stripTracking(text: string): string {
  return text
    .replace(/\?utm_source=[^&\s)]*(&)?/g, (_m, amp) => (amp ? '?' : ''))
    .replace(/&utm_source=[^&\s)]*/g, '');
}
