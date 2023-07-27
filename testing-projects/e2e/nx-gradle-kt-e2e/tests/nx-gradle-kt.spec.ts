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

import { checkstyleVersion } from '@jnxplus/common';
import {
  addTmpToGitignore,
  patchPackageJson,
  patchRootPackageJson,
  removeTmpFromGitignore,
  runNxNewCommand,
  runPackageManagerInstallLinks,
} from '@jnxplus/internal/testing';

describe('nx-gradle kotlin dsl e2e', () => {
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
      `generate @jnxplus/nx-gradle:init --dsl kotlin --rootProjectName ${rootProjectName}`
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

  it('should use dsl option when initiating the workspace', async () => {
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
        'settings.gradle.kts',
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

  it('should migrate', async () => {
    await runNxCommandAsync(`generate @jnxplus/nx-gradle:migrate`);
  }, 120000);

  it('1 none app', async () => {
    const appName = uniq('gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework none`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/App.java`,
        `apps/${appName}/src/test/resources/application.properties`,
        `apps/${appName}/src/test/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/AppTest.java`
      )
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const serveResult = await runNxCommandAsync(`serve ${appName}`);
    expect(serveResult.stdout).toContain('Executor ran for Serve');
    expect(serveResult.stdout).toContain('Hello World!');
  }, 120000);

  it('2 none app kt', async () => {
    const appName = uniq('gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework none --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/App.kt`,
        `apps/${appName}/src/test/resources/application.properties`,
        `apps/${appName}/src/test/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/AppTest.kt`
      )
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const serveResult = await runNxCommandAsync(`serve ${appName}`);
    expect(serveResult.stdout).toContain('Executor ran for Serve');
    expect(serveResult.stdout).toContain('Hello World!');
  }, 120000);

  it('1 none lib', async () => {
    const libName = uniq('gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework none`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle.kts`,
        `libs/${libName}/src/main/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/Library.java`,
        `libs/${libName}/src/test/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/LibraryTest.java`
      )
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 120000);

  it('2 none lib kt', async () => {
    const libName = uniq('gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework none --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle.kts`,
        `libs/${libName}/src/main/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/Library.kt`,
        `libs/${libName}/src/test/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/LibraryTest.kt`
      )
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(`ktformat ${libName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 120000);

  it('boot - should add a lib to an app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName}`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --projects ${appName}`
    );

    // Making sure the app build.gradle.kts file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

    const helloControllerPath = `apps/${appName}/src/main/java/com/example/${names(
      appName
    ).className.toLocaleLowerCase()}/HelloController.java`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*\s*;/;

    const regex2 = /public\s*class\s*HelloController\s*{/;

    const regex3 = /"Hello World!"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport org.springframework.beans.factory.annotation.Autowired;\nimport com.example.${names(
          libName
        ).className.toLocaleLowerCase()}.HelloService;`
      )
      .replace(regex2, '$&\n@Autowired\nprivate HelloService helloService;')
      .replace(regex3, 'this.helloService.message()');

    updateFile(helloControllerPath, newHelloControllerContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('HelloController.java');

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
  }, 120000);

  it('boot - should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --language kotlin --packaging war`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName}  --language kotlin --projects ${appName}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/ServletInitializer.kt`
      )
    ).not.toThrow();

    // Making sure the app build.gradle.kts file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

    const helloControllerPath = `apps/${appName}/src/main/kotlin/com/example/${names(
      appName
    ).className.toLocaleLowerCase()}/HelloController.kt`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*/;

    const regex2 = /class\s*HelloController/;

    const regex3 = /"Hello World!"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport org.springframework.beans.factory.annotation.Autowired\nimport com.example.${names(
          libName
        ).className.toLocaleLowerCase()}.HelloService`
      )
      .replace(regex2, '$&(@Autowired val helloService: HelloService)')
      .replace(regex3, 'helloService.message()');

    updateFile(helloControllerPath, newHelloControllerContent);

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
  }, 120000);
});
