import { uniq } from '@nx/plugin/testing';
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

describe('@jnxplus/nx-maven micronaut smoke', () => {
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
      'npx create-nx-maven-workspace@latest test --javaVersion 17 --groupId com.example --parentProjectName root-project --parentProjectVersion 0.0.0 --mavenRootDirectory nx-maven --dependencyManagement micronaut-parent-pom',
      {
        cwd: smokeDirectory,
        env: process.env,
        stdio: 'inherit',
      },
    );

    execSync('git init', execSyncOptions());

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib} --framework micronaut --projects ${testApp}`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp2} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp3} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp4} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib2} --framework micronaut --projects ${testApp2},${testApp3},${testApp4}`,
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
  }, 1500000);
});
