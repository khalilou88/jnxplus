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
      `npx create-nx-workspace@latest test --preset apps --nxCloud false`,
      {
        cwd: migrateDirectory,
        env: process.env,
        stdio: 'inherit',
      }
    );

    execSync('git init', execSyncOptions());

    execSync(
      `npm i --save-dev @jnxplus/nx-boot-gradle@latest`,
      execSyncOptions()
    );

    execSync('nx generate @jnxplus/nx-boot-gradle:init', execSyncOptions());

    execSync(
      `nx g @jnxplus/nx-boot-gradle:application ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-gradle:lib ${testLib} --projects ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-gradle:application ${testApp2}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-gradle:application ${testApp3}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-gradle:application ${testApp4}`,
      execSyncOptions()
    );

    execSync(
      `nx g @jnxplus/nx-boot-gradle:lib ${testLib2} --projects ${testApp2},${testApp3},${testApp4}`,
      execSyncOptions()
    );

    execSync(`nx run-many --target=build --all --parallel`, execSyncOptions());

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

    execSync('npx nx migrate next', execSyncOptions());

    execSync('npm i', execSyncOptions());

    execSync('npx nx migrate --run-migrations --ifExists', execSyncOptions());

    execSync(`git commit -am "chore: nx migrate"`, execSyncOptions());
  }, 1500000);
});
