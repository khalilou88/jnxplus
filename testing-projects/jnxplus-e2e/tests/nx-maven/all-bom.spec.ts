import { createTestWorkspace } from '@jnxplus/internal-testing';
import { names } from '@nx/devkit';
import {
  checkFilesExist,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nx/plugin/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('nx-maven all bom e2e', () => {
  let workspaceDirectory: string;

  const parentProjectName = uniq('parent-project-');

  beforeAll(async () => {
    workspaceDirectory = createTestWorkspace();

    // The plugin has been built and published to a local registry in the jest globalSetup
    // Install the plugin built with the latest source code into the test repo
    execSync(`npm install -D @jnxplus/nx-maven@e2e`, {
      cwd: workspaceDirectory,
      stdio: 'inherit',
      env: process.env,
    });

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:init --parentProjectName ${parentProjectName}`,
    );
  }, 240000);

  afterAll(async () => {
    // Cleanup the test project
    rmSync(workspaceDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should set NX_VERBOSE_LOGGING to true', async () => {
    expect(process.env['NX_VERBOSE_LOGGING']).toBe('true');
  }, 240000);

  it('should init the workspace with @jnxplus/nx-maven capabilities', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-maven dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-maven']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-maven inside the plugins section
    //const nxJson = readJson('nx.json');
    //expect(nxJson.plugins.includes('@jnxplus/nx-maven')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        '.mvn/wrapper/maven-wrapper.jar',
        '.mvn/wrapper/maven-wrapper.properties',
        'mvnw',
        'mvnw.cmd',
        'pom.xml',
      ),
    ).not.toThrow();
  }, 240000);

  it('1 none app', async () => {
    const appName = uniq('maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework none --parentProject ${parentProjectName}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/App.java`,
        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/AppTest.java`,
      ),
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const serveResult = await runNxCommandAsync(`serve ${appName}`);
    expect(serveResult.stdout).toContain('Executor ran for Serve');
    expect(serveResult.stdout).toContain('Hello World!');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 240000);

  it('should test an app with none option', async () => {
    const appName = uniq('maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework none --parentProject ${parentProjectName}`,
    );

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');
  }, 240000);

  it('should serve an app with none option', async () => {
    const appName = uniq('maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework none --parentProject ${parentProjectName}`,
    );
    const serveResult = await runNxCommandAsync(`serve ${appName}`);
    expect(serveResult.stdout).toContain('Executor ran for Serve');
    expect(serveResult.stdout).toContain('Hello World!');
  }, 240000);

  it('2 none app kt', async () => {
    const appName = uniq('maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework none --language kotlin --parentProject ${parentProjectName}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/App.kt`,
        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/AppTest.kt`,
      ),
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    // const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    // expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    const serveResult = await runNxCommandAsync(`serve ${appName}`);
    expect(serveResult.stdout).toContain('Executor ran for Serve');
    expect(serveResult.stdout).toContain('Hello World!');
  }, 240000);

  it('1 none lib', async () => {
    const libName = uniq('maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework none --parentProject ${parentProjectName}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/Library.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/LibraryTest.java`,
      ),
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${libName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 240000);

  it('2 none lib kt', async () => {
    const libName = uniq('maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework none --language kotlin --parentProject ${parentProjectName}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/Library.kt`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/LibraryTest.kt`,
      ),
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    // const formatResult = await runNxCommandAsync(`ktformat ${libName}`);
    // expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 240000);
});
