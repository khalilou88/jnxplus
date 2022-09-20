import { uniq } from '@nrwl/nx-plugin/testing';

import { execSync, ExecSyncOptions } from 'child_process';
import { join } from 'path';

import { dirSync } from 'tmp';

let smokeDirectory: string;
let cleanup: () => void;

const execSyncOptions: () => ExecSyncOptions = () => ({
  cwd: join(smokeDirectory, 'test'),
  env: {
    ...process.env,
    GIT_COMMITTER_NAME: 'Smoke Test CI',
    GIT_COMMITTER_EMAIL: 'no-reply@fake.com',
    GIT_AUTHOR_NAME: 'Smoke Test CI',
    GIT_AUTHOR_EMAIL: 'no-reply@fake.com',
  },
  stdio: 'inherit',
});

const testApp = uniq('test-app');
const testLib = uniq('test-lib');

describe('@jnxplus/nx-boot-gradle smoke', () => {
  beforeEach(async () => {
    ({ name: smokeDirectory, removeCallback: cleanup } = dirSync({
      unsafeCleanup: true,
    }));
  });

  afterEach(async () => {
    cleanup();
  });

  it('should work', async () => {
    execSync(
      'npx create-nx-workspace@latest test --preset ts --nxCloud false',
      {
        cwd: smokeDirectory,
        env: process.env,
        stdio: 'inherit',
      }
    );

    execSync('git init', execSyncOptions());

    execSync('npm i --save-dev @jnxplus/nx-boot-gradle', execSyncOptions());

    execSync('npx nx generate @jnxplus/nx-boot-gradle:init', execSyncOptions());

    execSync(
      `npx nx g @jnxplus/nx-boot-gradle:application ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-gradle:lib ${testLib} --projects ${testApp}`,
      execSyncOptions()
    );

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());
  }, 1500000);
});
