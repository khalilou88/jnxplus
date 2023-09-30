import { uniq } from '@nx/plugin/testing';
import { readJson } from 'fs-extra';

import { execSync, ExecSyncOptions } from 'child_process';
import { join } from 'path';

import { dirSync } from 'tmp';
import { ifNextVersionExists } from '@jnxplus/internal/testing';

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

describe('@jnxplus/nx-maven spring-boot smoke', () => {
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
      'npx create-nx-workspace@latest test --preset empty --nxCloud false',
      {
        cwd: smokeDirectory,
        env: process.env,
        stdio: 'inherit',
      },
    );

    execSync('git init', execSyncOptions());

    execSync('npm i --save-dev @jnxplus/nx-maven', execSyncOptions());

    execSync(
      'npx nx generate @jnxplus/nx-maven:init --dependencyManagement spring-boot-parent-pom',
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp} --framework spring-boot`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib} --framework spring-boot --projects ${testApp}`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp2} --framework spring-boot`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp3} --framework spring-boot`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp4} --framework spring-boot`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib2} --framework spring-boot --projects ${testApp2},${testApp3},${testApp4}`,
      execSyncOptions(),
    );

    execSync(`npx nx test ${testLib}`, execSyncOptions());

    execSync(`npx nx run-many --target=build --parallel=1`, execSyncOptions());

    execSync(`npx nx graph --file=dep-graph.json`, execSyncOptions());

    const depGraphJson = await readJson(
      join(smokeDirectory, 'test', 'dep-graph.json'),
    );
    expect(depGraphJson.graph.nodes[testApp]).toBeDefined();
    expect(depGraphJson.graph.nodes[testLib]).toBeDefined();

    expect(depGraphJson.graph.dependencies[testApp]).toContainEqual({
      type: 'static',
      source: testApp,
      target: testLib,
    });

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());

    execSync(
      `npx nx graph --affected --file=dep-graph-affected.json`,
      execSyncOptions(),
    );

    const depGraphAffectedJson = await readJson(
      join(smokeDirectory, 'test', 'dep-graph-affected.json'),
    );
    expect(depGraphAffectedJson.graph.nodes[testApp]).toBeDefined();
    expect(depGraphAffectedJson.graph.nodes[testApp2]).toBeDefined();
    expect(depGraphAffectedJson.graph.nodes[testApp3]).toBeDefined();
    expect(depGraphAffectedJson.graph.nodes[testApp4]).toBeDefined();
    expect(depGraphAffectedJson.graph.nodes[testLib]).toBeDefined();
    expect(depGraphAffectedJson.graph.nodes[testLib2]).toBeDefined();
  }, 1500000);
});
