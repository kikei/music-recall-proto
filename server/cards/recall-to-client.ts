import type { RecallResult } from './recall.js';

// Shape a recall result for the client. The project slug is what the client
// needs to build the card's link; recall itself does not know about URLs.
export function recallResultToClient(
  result: RecallResult,
  projectSlug: string
) {
  const { id, ...rest } = result;
  return { id, projectSlug, ...rest };
}
