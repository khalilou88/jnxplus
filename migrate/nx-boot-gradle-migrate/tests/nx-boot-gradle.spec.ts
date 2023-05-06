import { execSync, ExecSyncOptions } from 'child_process';
import { join } from 'path';

import { dirSync } from 'tmp';

let nxOldVersion = '15.9.4';

let migrateDirectory: string;
let cleanup: () => void;

const execSyncOptions: () => ExecSyncOptions = () => ({
  cwd: join(migrateDirectory, 'test'),
  env: {
    ...process.env,
    GIT_COMMITTER_NAME: 'Nx migrate Test CI',
    GIT_COMMITTER_EMAIL: 'no-reply@fake.com',
    GIT_AUTHOR_NAME: 'Nx migrate Test CI',
    GIT_AUTHOR_EMAIL: 'no-reply@fake.com',
  },
  stdio: 'inherit',
});

describe('@jnxplus/nx-boot-gradle migrate', () => {
  beforeEach(async () => {
    ({ name: migrateDirectory, removeCallback: cleanup } = dirSync({
      unsafeCleanup: true,
    }));
  });

  afterEach(async () => {
    cleanup();
  });

  it('should migrate', async () => {
    execSync(
      `npx create-nx-workspace@${nxOldVersion} test --preset empty --nxCloud false`,
      {
        cwd: migrateDirectory,
        env: process.env,
        stdio: 'inherit',
      }
    );

    execSync('git init', execSyncOptions());

    execSync('npm i --save-dev @jnxplus/nx-boot-gradle', execSyncOptions());

    execSync('npx nx migrate latest', execSyncOptions());

    execSync('npm i', execSyncOptions());

    execSync('npx nx migrate --run-migrations --ifExists', execSyncOptions());

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());
  }, 1500000);
});
