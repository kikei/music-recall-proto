import { existsSync } from 'node:fs';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';

// Serves the built frontend alongside the API, so a deployment is one container
// and one origin: no CDN to configure and no cross-origin setup for the token
// header. In development this is absent and Vite serves the app instead.
//
// WEB_ROOT points at the build output. When it is missing -- running the
// compiled server without having built the frontend -- the routes are simply
// not mounted, and the API still works.
const root = process.env.WEB_ROOT ?? 'dist';

export const webAppAvailable = existsSync(root);

export const webApp = new Hono();

if (webAppAvailable) {
  webApp.use('/assets/*', serveStatic({ root }));
  webApp.get('/favicon.ico', serveStatic({ path: `${root}/favicon.ico` }));
  // Everything else is the single page app: sign-in lands on /callback, and a
  // reload of any path has to reach index.html rather than a 404.
  webApp.get('*', serveStatic({ path: `${root}/index.html` }));
}
