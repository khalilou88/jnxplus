import { uniq } from '@nx/plugin/testing';
import { execSync, ExecSyncOptions } from 'child_process';
import { readJson } from 'fs-extra';
import { join } from 'path';

import { dirSync } from 'tmp';

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

const testApp = uniq('test-app');
const testLib = uniq('test-lib');

const testApp2 = uniq('test-app2');
const testLib2 = uniq('test-lib2');
const testApp3 = uniq('test-app3');
const testApp4 = uniq('test-app4');

describe('@jnxplus/nx-boot-maven migrate', () => {
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
      `npx create-nx-workspace@latest test --preset apps --nxCloud false`,
      {
        cwd: migrateDirectory,
        env: process.env,
        stdio: 'inherit',
      }
    );

    execSync('git init', execSyncOptions());

    execSync(`npm i --save-dev @nx/devkit@latest`, execSyncOptions());

    execSync(
      `npm i --save-dev @jnxplus/nx-boot-maven@latest`,
      execSyncOptions()
    );

    execSync('nx generate @jnxplus/nx-boot-maven:init', execSyncOptions());

    execSync(
      `nx g @jnxplus/nx-boot-maven:application ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-maven:lib ${testLib} --projects ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-maven:application ${testApp2}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-maven:application ${testApp3}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-maven:application ${testApp4}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-maven:lib ${testLib2} --projects ${testApp2},${testApp3},${testApp4}`,
      execSyncOptions()
    );

    execSync(
      `nx run-many --target=build --all --parallel=1`,
      execSyncOptions()
    );

    execSync(`nx graph --file=dep-graph.json`, execSyncOptions());

    const depGraphJson = await readJson(
      join(migrateDirectory, 'test', 'dep-graph.json')
    );
    expect(depGraphJson.graph.nodes[testApp]).toBeDefined();
    expect(depGraphJson.graph.nodes[testLib]).toBeDefined();

    expect(depGraphJson.graph.dependencies[testApp]).toContainEqual({
      type: 'static',
      source: testApp,
      target: testLib,
    });

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());

    execSync('npx nx@next migrate next', execSyncOptions());

    execSync('npm i --legacy-peer-deps', execSyncOptions());

    execSync(
      'npx nx@next migrate --run-migrations --ifExists',
      execSyncOptions()
    );

    execSync(`git commit -am "chore: nx migrate"`, execSyncOptions());
  }, 1500000);
});
