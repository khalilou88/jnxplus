import { readJson, uniq } from '@nx/plugin/testing';
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

const workspaceName = uniq('workspace-');
const aggregatorProjectName = uniq('aggregator-project-');
const parentProjectName = uniq('parent-project-');

const testApp = uniq('test-app-');
const testLib = uniq('test-lib-');
const testApp2 = uniq('test-app2-');
const testLib2 = uniq('test-lib2-');
const testApp3 = uniq('test-app3-');
const testApp4 = uniq('test-app4-');
const testApp5 = uniq('test-app5-');
const testLib5 = uniq('test-lib5-');
const testApp6 = uniq('test-app6-');

describe('nx-maven micronaut smoke', () => {
  beforeAll(async () => {
    ({ name: smokeDirectory, removeCallback: cleanup } = dirSync({
      unsafeCleanup: true,
    }));

    execSync(
      `npx create-nx-maven-workspace@${process.env.NPM_TAG} ${workspaceName} --javaVersion 17 --groupId com.example --aggregatorProjectName ${aggregatorProjectName} --parentProjectVersion 0.0.0 --mavenRootDirectory nx-maven`,
      {
        cwd: smokeDirectory,
        env: process.env,
        stdio: 'inherit',
      },
    );

    execSync('git init', execSyncOptions());

    execSync('npm i', execSyncOptions());

    execSync(
      `npx nx generate @jnxplus/nx-maven:parent-project ${parentProjectName} --dependencyManagement micronaut-parent-pom --language kotlin`,
      execSyncOptions(),
    );
  });

  afterAll(async () => {
    cleanup();
  });

  it('should work', async () => {
    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp} --parentProject ${parentProjectName} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib} --parentProject ${parentProjectName} --framework micronaut --projects ${testApp}`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp2} --parentProject ${parentProjectName} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp3} --parentProject ${parentProjectName} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp4} --parentProject ${parentProjectName} --framework micronaut`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib2} --parentProject ${parentProjectName} --framework micronaut --projects ${testApp2},${testApp3},${testApp4}`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp5} --parentProject ${parentProjectName} --framework micronaut --language kotlin`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:application ${testApp6} --parentProject ${parentProjectName} --framework micronaut --language kotlin`,
      execSyncOptions(),
    );

    execSync(
      `npx nx g @jnxplus/nx-maven:lib ${testLib5} --parentProject ${parentProjectName} --framework micronaut --language kotlin --projects ${testApp5},${testApp6}`,
      execSyncOptions(),
    );

    execSync(`npx nx test ${testLib}`, execSyncOptions());

    execSync(`npx nx run-many --target=build --parallel`, execSyncOptions());

    execSync(`npx nx graph --file=dep-graph.json`, execSyncOptions());

    const depGraphJson = await readJson(
      join(smokeDirectory, workspaceName, 'dep-graph.json'),
    );
    expect(depGraphJson.graph.nodes[testApp]).toBeDefined();
    expect(depGraphJson.graph.nodes[testLib]).toBeDefined();

    expect(depGraphJson.graph.dependencies[testApp]).toContainEqual({
      type: 'static',
      source: testApp,
      target: testLib,
    });

    execSync(`git add --all`, execSyncOptions());

    execSync(`git commit -am "chore: scaffold projects"`, execSyncOptions());
  }, 1500000);
});
