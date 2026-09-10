// The scaffold seeded into freeform metadata. Stored as plain text (meant for
// full-text search later, not parsed back into columns). The values are left
// empty; auto-fill will later put a '-' only where it looked something up and
// found nothing, so a '-' means "checked, none" rather than "not yet entered".
export const METADATA_TEMPLATE_KEYS = [
  'Album',
  'Track',
  'Artist(s)',
  'Released',
  'Label',
  'Memo',
] as const;

export type MetadataTemplateKey = (typeof METADATA_TEMPLATE_KEYS)[number];

export const BLANK_METADATA_TEMPLATE = METADATA_TEMPLATE_KEYS.map(
  key => `${key}:`
).join('\n');

// Keys auto-fill may populate. Memo is the user's own note, never touched.
export type LookupMetadataKey = Exclude<MetadataTemplateKey, 'Memo'>;

// Fill only the template lines that are still blank (`Key:` with nothing
// after it). A line already carrying a value - hand-typed or a previous '-'
// - is left untouched, and so is any line the user removed. This is what
// keeps auto-fill from clobbering existing notes.
export function fillMetadataTemplate(
  current: string,
  values: Partial<Record<LookupMetadataKey, string>>
): string {
  const byKey = new Map(Object.entries(values));
  return current
    .split('\n')
    .map(line => {
      const blank = line.match(/^([^:]+):\s*$/);
      const value = blank ? byKey.get(blank[1]) : undefined;
      return value ? `${blank![1]}: ${value}` : line;
    })
    .join('\n');
}
