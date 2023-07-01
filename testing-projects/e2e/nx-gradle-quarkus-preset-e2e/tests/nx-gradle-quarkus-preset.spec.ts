import { checkstyleVersion } from '@jnxplus/common';
import {
  addTmpToGitignore,
  patchPackageJson,
  patchRootPackageJson,
  removeTmpFromGitignore,
  runNxNewCommand,
  runPackageManagerInstallLinks,
} from '@jnxplus/internal/testing';
import { names, workspaceRoot } from '@nx/devkit';
import {
  checkFilesExist,
  cleanup,
  readFile,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing';
import * as fse from 'fs-extra';
import * as path from 'path';

describe('nx-gradle quarkus preset e2e', () => {
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const rootProjectName = uniq('boot-root-project-');

  beforeAll(async () => {
    fse.ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand('', true);

    const pluginName = '@jnxplus/nx-gradle';
    const nxGradleDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'nx-gradle'
    );

    const commonDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'common'
    );

    const gradleDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'gradle'
    );

    patchRootPackageJson(pluginName, nxGradleDistAbsolutePath);
    patchRootPackageJson('@jnxplus/common', commonDistAbsolutePath);
    patchRootPackageJson('@jnxplus/gradle', gradleDistAbsolutePath);

    patchPackageJson(
      gradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );

    patchPackageJson(
      nxGradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );
    patchPackageJson(
      nxGradleDistAbsolutePath,
      '@jnxplus/gradle',
      gradleDistAbsolutePath
    );

    runPackageManagerInstallLinks();

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:init --rootProjectName ${rootProjectName} --preset quarkus`
    );

    if (isCI) {
      removeTmpFromGitignore();
    }
  }, 120000);

  afterAll(async () => {
    if (isCI) {
      addTmpToGitignore();
    }

    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  it('should set NX_VERBOSE_LOGGING to true', async () => {
    expect(process.env['NX_VERBOSE_LOGGING']).toBe('true');
  }, 120000);

  it('should init the workspace with @jnxplus/nx-gradle capabilities', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-gradle dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-gradle']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-gradle inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-gradle')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        'gradle/wrapper/gradle-wrapper.jar',
        'gradle/wrapper/gradle-wrapper.properties',
        'gradlew',
        'gradlew.bat',
        'gradle.properties',
        'settings.gradle',
        'tools/linters/checkstyle.xml'
      )
    ).not.toThrow();

    expect(() =>
      checkFilesExist(
        `node_modules/@jnxplus/tools/linters/checkstyle/checkstyle-${checkstyleVersion}-all.jar`,
        `node_modules/@jnxplus/tools/linters/ktlint/ktlint`
      )
    ).not.toThrow();
  }, 120000);

  it('quarkus - should add a lib to an app dependencies', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --groupId org.acme`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --projects ${appName} --framework quarkus --groupId org.acme`
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

    const greetingResourcePath = `apps/${appName}/src/main/java/org/acme/${names(
      appName
    ).className.toLocaleLowerCase()}/GreetingResource.java`;
    const greetingResourceContent = readFile(greetingResourcePath);

    const regex1 = /package\s*org\.acme\..*\s*;/;

    const regex2 = /public\s*class\s*GreetingResource\s*{/;

    const regex3 = /"Hello World!"/;

    const newGreetingResourceContent = greetingResourceContent
      .replace(
        regex1,
        `$&\nimport jakarta.inject.Inject;\nimport org.acme.${names(
          libName
        ).className.toLocaleLowerCase()}.GreetingService;`
      )
      .replace(regex2, '$&\n@Inject\nGreetingService service;')
      .replace(regex3, 'service.greeting()');

    updateFile(greetingResourcePath, newGreetingResourceContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('GreetingResource.java');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=dep-graph.json`);
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.nodes[rootProjectName]).toBeDefined();
    expect(depGraphJson.graph.nodes[appName]).toBeDefined();
    expect(depGraphJson.graph.nodes[libName]).toBeDefined();

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: libName,
    });
  }, 240000);

  it('quarkus - should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --language kotlin --framework quarkus --groupId org.acme`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName}  --language kotlin --projects ${appName} --framework quarkus --groupId org.acme`
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

    const greetingResourcePath = `apps/${appName}/src/main/kotlin/org/acme/${names(
      appName
    ).className.toLocaleLowerCase()}/GreetingResource.kt`;
    const greetingResourceContent = readFile(greetingResourcePath);

    const regex1 = /package\s*org\.acme\..*/;

    const regex2 = /class\s*GreetingResource/;

    const regex3 = /"Hello World!"/;

    const newGreetingResourceContent = greetingResourceContent
      .replace(
        regex1,
        `$&\nimport org.acme.${names(
          libName
        ).className.toLocaleLowerCase()}.GreetingService`
      )
      .replace(regex2, '$&(private val greetingService: GreetingService)')
      .replace(regex3, 'greetingService.greeting()');

    updateFile(greetingResourcePath, newGreetingResourceContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=dep-graph.json`);
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.nodes[rootProjectName]).toBeDefined();
    expect(depGraphJson.graph.nodes[appName]).toBeDefined();
    expect(depGraphJson.graph.nodes[libName]).toBeDefined();

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: libName,
    });
  }, 240000);
});
