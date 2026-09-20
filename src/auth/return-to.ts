const RETURN_TO_KEY = 'music-recall:return-to';
let callbackDestination: string | null = null;

export function rememberCurrentPage() {
  sessionStorage.setItem(
    RETURN_TO_KEY,
    window.location.pathname + window.location.search + window.location.hash
  );
}

export function returnToPage(): string {
  if (callbackDestination) return callbackDestination;
  const saved = sessionStorage.getItem(RETURN_TO_KEY);
  sessionStorage.removeItem(RETURN_TO_KEY);
  callbackDestination =
    saved?.startsWith('/') &&
    !saved.startsWith('//') &&
    !saved.startsWith('/callback')
      ? saved
      : '/';
  return callbackDestination;
}
