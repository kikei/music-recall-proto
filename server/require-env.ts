// Read a required environment variable, failing fast with a clear message
// instead of silently falling back to a hardcoded default. Model choices in
// particular should be explicit per deployment: a wrong silent default can be
// expensive or subtly off.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です。.env に設定してください。`);
  }
  return value;
}
