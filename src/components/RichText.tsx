import { Fragment, type ReactNode } from 'react';

// Convert Markdown links [label](URL) and bare URLs into hyperlinks.
// Other text is left as-is (newlines preserved via CSS white-space).
const PATTERN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;

// Tracking params like utm_source that OpenAI's web search appends don't match
// reality, so strip them.
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('utm_source');
    return u.toString();
  } catch {
    return url;
  }
}

export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = PATTERN.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <Fragment key={key++}>{text.slice(last, match.index)}</Fragment>
      );
    }
    const url = cleanUrl(match[2] ?? match[3]);
    const label = match[1] ?? url;
    parts.push(
      <a key={key++} href={url} target="_blank" rel="noreferrer noopener">
        {label}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  return <>{parts}</>;
}
