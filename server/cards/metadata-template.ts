// The scaffold seeded into freeform metadata. Stored as plain text (meant for
// full-text search later, not parsed back into columns). The values are left
// empty; auto-fill will later put a '-' only where it looked something up and
// found nothing, so a '-' means "checked, none" rather than "not yet entered".
export const BLANK_METADATA_TEMPLATE = [
  'Album:',
  'Track:',
  'Artist(s):',
  'Released:',
  'Label:',
  'Memo:',
].join('\n');
