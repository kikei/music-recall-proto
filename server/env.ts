// Import this module first at the top of index.ts so that .env is loaded
// before any other module reads environment variables.
try {
  process.loadEnvFile('.env');
} catch {
  // The server can still start without .env (a missing-key warning follows).
}
