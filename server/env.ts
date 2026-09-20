// Import this module first at the top of index.ts so that .env is loaded
// before any other module reads environment variables.
try {
  process.loadEnvFile('.env');
} catch (error) {
  // A checkout need not have a local .env. Other failures, such as a file
  // that cannot be read or parsed, are configuration errors and must surface.
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
