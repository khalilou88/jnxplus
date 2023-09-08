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

import { checkstyleVersion, normalizeName } from '@jnxplus/common';
import {
  addTmpToGitignore,
  checkFilesDoNotExist,
  getData,
  killPorts,
  patchPackageJson,
  patchRootPackageJson,
  promisifiedTreeKill,
  removeTmpFromGitignore,
  runNxCommandUntil,
  runNxNewCommand,
  runPackageManagerInstallLinks,
  updateNx,
} from '@jnxplus/internal/testing';

describe('nx-boot-gradle kt e2e', () => {
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
    const nxBootGradleDistAbsolutePath = path.join(
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

    patchRootPackageJson(pluginName, nxBootGradleDistAbsolutePath);
    patchRootPackageJson('@jnxplus/common', commonDistAbsolutePath);
    patchRootPackageJson('@jnxplus/gradle', gradleDistAbsolutePath);

    patchPackageJson(
      gradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );

    patchPackageJson(
      nxBootGradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );
    patchPackageJson(
      nxBootGradleDistAbsolutePath,
      '@jnxplus/gradle',
      gradleDistAbsolutePath
    );

    runPackageManagerInstallLinks();

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:init --dsl kotlin --rootProjectName ${rootProjectName} --preset spring-boot`
    );
    updateNx();

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

  it('should create a java application', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/${appName}/src/test/resources/application.properties`,
        `apps/${appName}/src/test/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    //test run-task
    const projectJson = readJson(`apps/${appName}/project.json`);
    projectJson.targets = {
      ...projectJson.targets,
      'run-task': {
        executor: '@jnxplus/nx-gradle:run-task',
      },
    };
    updateFile(`apps/${appName}/project.json`, JSON.stringify(projectJson));
    const runTaskResult = await runNxCommandAsync(
      `run-task ${appName} --task="test"`
    );
    expect(runTaskResult.stdout).toContain('Executor ran for Run Task');
    //end test run-task

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): 8080`)
    );

    const dataResult = await getData();
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should build-image a java application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('boot-gradle-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot`
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework spring-boot --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/build.gradle.kts`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `apps/${appDir}/${randomName}/src/test/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(
      `apps/${appDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework spring-boot --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/build.gradle.kts`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `apps/${appDir}/${randomName}/src/test/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the correct information
    const buildGradle = readFile(
      `apps/${appDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a kotlin application', async () => {
    const appName = uniq('boot-gradle-app-');
    const port = 8383;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --language kotlin --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.kt`,
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.kt`,
        `apps/${appName}/src/test/resources/application.properties`,
        `apps/${appName}/src/test/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }ApplicationTests.kt`,
        `apps/${appName}/src/test/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.kt`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should build-image a kotlin application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('boot-gradle-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --language kotlin`
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('--an app with aliases', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:app ${randomName} --framework spring-boot --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/build.gradle.kts`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `apps/${appDir}/${randomName}/src/test/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(
      `apps/${appDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('directory with dash', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework spring-boot --directory deep/sub-dir --port ${port}`
    );

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle.kts`,
        `libs/${libName}/src/main/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libName}/src/test/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libName}/src/test/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`libs/${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should create a kotlin library', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle.kts`,
        `libs/${libName}/src/main/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `libs/${libName}/src/test/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.kt`,
        `libs/${libName}/src/test/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.kt`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`libs/${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(`ktformat ${libName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should create a library with the specified properties', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework spring-boot --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/build.gradle.kts`,
        `libs/${libDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(
      `libs/${libDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework spring-boot --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/build.gradle.kts`,
        `libs/${libDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the correct information
    const buildGradle = readFile(
      `libs/${libDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:lib ${randomName} --framework spring-boot --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/build.gradle.kts`,
        `libs/${libDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(
      `libs/${libDir}/${randomName}/build.gradle.kts`
    );
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --projects ${appName}`
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

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --language kotlin --packaging war`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --language kotlin --projects ${appName}`
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

  it('should create an application with a simple name', async () => {
    const appName = uniq('boot-gradle-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${appName}/build.gradle.kts`,
        `apps/${appDir}/${appName}/src/main/resources/application.yml`,
        `apps/${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/${appDir}/${appName}/src/test/resources/application.yml`,
        `apps/${appDir}/${appName}/src/test/java/com/jnxplus/deep/subdir/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`apps/${appDir}/${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${appName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    const dataResult = await getData(port);
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library with a simple name', async () => {
    const libName = uniq('boot-gradle-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${libName}/build.gradle.kts`,
        `libs/${libDir}/${libName}/src/main/java/com/jnxplus/deep/subdir/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`libs/${libDir}/${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${libName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should create a minimal java application', async () => {
    const appName = uniq('boot-gradle-app-');
    const port = 8787;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --minimal --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/test/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }ApplicationTests.java`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `apps/${appName}/src/main/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `apps/${appName}/src/test/resources/application.properties`,
        `apps/${appName}/src/test/java/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a minimal kotlin application', async () => {
    const appName = uniq('boot-gradle-app-');
    const port = 8888;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework spring-boot --language kotlin --minimal --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.kt`,
        `apps/${appName}/src/test/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }ApplicationTests.kt`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/ServletInitializer.kt`,
        `apps/${appName}/src/main/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.kt`,
        `apps/${appName}/src/test/resources/application.properties`,

        `apps/${appName}/src/test/kotlin/com/example/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.kt`
      )
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port(s): ${port}`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should skip starter code when generating a java library with skipStarterCode option', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(`libs/${libName}/build.gradle.kts`)
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `libs/${libName}/src/main/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/${libName}/src/test/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/${libName}/src/test/java/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot --language kotlin --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(`libs/${libName}/build.gradle.kts`)
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `libs/${libName}/src/main/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `apps/${libName}/src/test/resources/junit-platform.properties`,
        `libs/${libName}/src/test/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.kt`,
        `libs/${libName}/src/test/kotlin/com/example/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.kt`
      )
    ).not.toThrow();
  }, 120000);

  it('optional project.json', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework spring-boot`
    );

    //graph
    const localTmpDir = path.dirname(tmpProjPath());
    const projectJson = path.join(
      localTmpDir,
      'proj',
      'libs',
      libName,
      'project.json'
    );
    fse.removeSync(projectJson);
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
    );
  }, 120000);
});
