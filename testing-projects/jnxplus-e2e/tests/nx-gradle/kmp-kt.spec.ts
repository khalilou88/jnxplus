import { createTestWorkspace } from '@jnxplus/internal/testing';
import {
  checkFilesExist,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nx/plugin/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('nx-gradle kmp kotlin dsl e2e', () => {
  let workspaceDirectory: string;

  const rootProjectName = uniq('root-project-');

  beforeAll(async () => {
    workspaceDirectory = createTestWorkspace();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugin built with the latest source code into the test repo
    execSync(`npm install -D @jnxplus/nx-gradle@e2e`, {
      cwd: workspaceDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:init --dsl kotlin --rootProjectName ${rootProjectName} --preset kmp`,
    );
  }, 120000);

  afterAll(async () => {
    // Cleanup the test project
    rmSync(workspaceDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should set NX_VERBOSE_LOGGING to true', async () => {
    expect(process.env['NX_VERBOSE_LOGGING']).toBe('true');
  }, 120000);

  it('should use dsl option when initiating the workspace', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-gradle dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-gradle']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-gradle inside the plugins section
    //const nxJson = readJson('nx.json');
    //expect(nxJson.plugins.includes('@jnxplus/nx-gradle')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        'gradle/wrapper/gradle-wrapper.jar',
        'gradle/wrapper/gradle-wrapper.properties',
        'gradlew',
        'gradlew.bat',
        'gradle.properties',
        'settings.gradle.kts',
      ),
    ).not.toThrow();
  }, 120000);

  it('shoud works', async () => {
    const name = uniq('kmp-');

    await runNxCommandAsync(`generate @jnxplus/nx-gradle:kmp ${name}`);
  }, 240000);
});
