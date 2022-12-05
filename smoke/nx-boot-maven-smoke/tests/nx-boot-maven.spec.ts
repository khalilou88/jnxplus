import { uniq } from '@nrwl/nx-plugin/testing';
import { readJson } from 'fs-extra';

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

const testApp2 = uniq('test-app2');
const testLib2 = uniq('test-lib2');
const testApp3 = uniq('test-app3');
const testApp4 = uniq('test-app4');

describe('@jnxplus/nx-boot-maven smoke', () => {
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

    execSync('npm i --save-dev @jnxplus/nx-boot-maven', execSyncOptions());

    execSync('npx nx generate @jnxplus/nx-boot-maven:init', execSyncOptions());

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:application ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:lib ${testLib} --projects ${testApp}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:application ${testApp2}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:application ${testApp3}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:application ${testApp4}`,
      execSyncOptions()
    );

    execSync(
      `npx nx g @jnxplus/nx-boot-maven:lib ${testLib2} --projects ${testApp2},${testApp3},${testApp4}`,
      execSyncOptions()
    );

    execSync(
      `npx nx run-many --target=build --all --parallel=1`,
      execSyncOptions()
    );

    execSync(`npx nx graph --file=dep-graph.json`, execSyncOptions());

    const depGraphJson = await readJson(
      join(smokeDirectory, 'test', 'dep-graph.json')
    );
    expect(depGraphJson.graph.nodes[testApp]).toBeDefined();
    expect(depGraphJson.graph.nodes[testLib]).toBeDefined();

    expect(depGraphJson.graph.dependencies[testApp]).toContainEqual({
      type: 'static',
      source: testApp,
      target: testLib,
    });

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());
  }, 1500000);
});
