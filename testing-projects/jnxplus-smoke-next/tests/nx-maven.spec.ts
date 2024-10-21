import { ifNextVersionExists } from '@jnxplus/internal/testing';
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

const testApp = uniq('test-app');
const testLib = uniq('test-lib');
const testApp2 = uniq('test-app2');
const testLib2 = uniq('test-lib2');
const testApp3 = uniq('test-app3');
const testApp4 = uniq('test-app4');

describe('nx-maven spring-boot smoke-next', () => {
  beforeAll(async () => {
    ({ name: smokeDirectory, removeCallback: cleanup } = dirSync({
      unsafeCleanup: true,
    }));
  });

  afterAll(async () => {
    cleanup();
  });

  it('should work', async () => {
    if (ifNextVersionExists()) {
      execSync(
        `npx create-nx-workspace@${process.env.NX_NPM_TAG} ${workspaceName} --preset apps --nxCloud skip`,
        {
          cwd: smokeDirectory,
          env: process.env,
          stdio: 'inherit',
        },
      );

      execSync('git init', execSyncOptions());

      execSync('npm i --save-dev @jnxplus/nx-maven', execSyncOptions());

      execSync(
        `npx nx generate @jnxplus/nx-maven:init --mavenRootDirectory . --aggregatorProjectName ${aggregatorProjectName}`,
        execSyncOptions(),
      );

      execSync(
        `npx nx generate @jnxplus/nx-maven:parent-project ${parentProjectName} --dependencyManagement spring-boot-parent-pom --language kotlin`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:application ${testApp} --parentProject ${parentProjectName} --framework spring-boot`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:lib ${testLib} --parentProject ${parentProjectName} --framework spring-boot --projects ${testApp}`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:application ${testApp2} --parentProject ${parentProjectName} --framework spring-boot`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:application ${testApp3} --parentProject ${parentProjectName} --framework spring-boot`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:application ${testApp4} --parentProject ${parentProjectName} --framework spring-boot`,
        execSyncOptions(),
      );

      execSync(
        `npx nx g @jnxplus/nx-maven:lib ${testLib2} --parentProject ${parentProjectName} --framework spring-boot --projects ${testApp2},${testApp3},${testApp4}`,
        execSyncOptions(),
      );

      execSync(`npx nx test ${testLib}`, execSyncOptions());

      execSync(`npx nx run-many --target=build --parallel`, execSyncOptions());

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

      execSync('npx nx@next migrate next', execSyncOptions());

      execSync('npm i --legacy-peer-deps', execSyncOptions());

      execSync(
        'npx nx@next migrate --run-migrations --ifExists',
        execSyncOptions(),
      );

      execSync(`nx run-many --target=build --parallel`, execSyncOptions());

      execSync(`nx graph --file=dep-graph.json`, execSyncOptions());

      const depGraphJson2 = await readJson(
        join(smokeDirectory, 'test', 'dep-graph.json'),
      );
      expect(depGraphJson2.graph.nodes[testApp]).toBeDefined();
      expect(depGraphJson2.graph.nodes[testLib]).toBeDefined();

      expect(depGraphJson2.graph.dependencies[testApp]).toContainEqual({
        type: 'static',
        source: testApp,
        target: testLib,
      });

      execSync(`git commit -am "chore: nx migrate"`, execSyncOptions());
    }
  }, 1500000);
});
