// Lets the API client tell the app that the session is no longer good, without
// knowing anything about how signing in works. The gate registers the handler,
// the client reports, and the person is offered a way back in rather than being
// left on a screen that has quietly stopped working.
type Handler = () => void;

let handler: Handler | null = null;

export function onUnauthorized(next: Handler | null): void {
  handler = next;
}

export function reportUnauthorized(): void {
  handler?.();
}
