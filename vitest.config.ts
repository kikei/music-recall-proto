import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // server/db/open.ts opens a real sqlite file (and runs migrations against
    // it) as an import side effect. Point it at a scratch file so running
    // tests never touches the developer's actual data/music-recall.sqlite,
    // and run test files serially so the two files that transitively import
    // it don't race to migrate the same file concurrently. migrate.ts also
    // copies the file for a backup, so ':memory:' does not work here.
    env: {
      DB_PATH: '.vitest-tmp/test.sqlite',
    },
    fileParallelism: false,
  },
});
