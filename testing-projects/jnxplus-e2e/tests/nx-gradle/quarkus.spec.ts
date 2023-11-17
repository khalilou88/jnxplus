import { normalizeName } from '@jnxplus/common';
import {
  addJVMMemory,
  addTmpToGitignore,
  checkFilesDoNotExist,
  createTestWorkspace,
  getData,
  killPorts,
  promisifiedTreeKill,
  removeTmpFromGitignore,
  runNxCommandUntil,
} from '@jnxplus/internal/testing';
import { names } from '@nx/devkit';
import {
  checkFilesExist,
  readFile,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';

describe('nx-gradle quarkus e2e', () => {
  let workspaceDirectory: string;
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const rootProjectName = uniq('quarkus-root-project-');

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
      `generate @jnxplus/nx-gradle:init --rootProjectName ${rootProjectName} --preset quarkus`,
    );

    addJVMMemory();

    if (isCI) {
      removeTmpFromGitignore();
    }
  }, 120000);

  afterAll(async () => {
    if (isCI) {
      addTmpToGitignore();
    }
    // Cleanup the test project
    rmSync(workspaceDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should set NX_VERBOSE_LOGGING to true', async () => {
    expect(process.env['NX_VERBOSE_LOGGING']).toBe('true');
  }, 120000);

  it('should init the workspace with @jnxplus/nx-gradle capabilities', async () => {
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
        'settings.gradle',
      ),
    ).not.toThrow();
  }, 120000);

  it('should create a java application', async () => {
    const appName = uniq('quarkus-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --groupId org.acme`,
    );

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/java/.gitkeep`,
        `${appName}/src/test/java/.gitkeep`,
        `${appName}/src/native-test/java/.gitkeep`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle`,
        `${appName}/src/main/resources/application.properties`,

        `${appName}/src/main/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appName}/src/test/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${appName}/build.gradle`);
    expect(buildGradle.includes('org.acme')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`${appName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //test run-task
    const projectJson = readJson(`${appName}/project.json`);
    projectJson.targets = {
      ...projectJson.targets,
      'run-task': {
        executor: '@jnxplus/nx-gradle:run-task',
      },
    };
    updateFile(`${appName}/project.json`, JSON.stringify(projectJson));
    const runTaskResult = await runNxCommandAsync(
      `run-task ${appName} --task="test"`,
    );
    expect(runTaskResult.stdout).toContain('Executor ran for Run Task');
    //end test run-task

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const port = 8080;
    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should build-image a java application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('quarkus-gradle-app-');

      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus`,
      );

      const buildResult = await runNxCommandAsync(`build ${appName}`);
      expect(buildResult.stdout).toContain('Executor ran for Build');

      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('quarkus-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework quarkus --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('quarkus-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework quarkus --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3 --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the correct information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a kotlin application', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const port = 8383;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --language kotlin --port ${port} --groupId org.acme`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.kt`,
        `${appName}/src/test/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.kt`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/kotlin/.gitkeep`,
        `${appName}/src/test/kotlin/.gitkeep`,
        `${appName}/src/native-test/kotlin/.gitkeep`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${appName}/build.gradle`);
    expect(buildGradle.includes('org.acme')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`${appName}/build`)).not.toThrow();

    // const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    // expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should build-image a kotlin application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('quarkus-gradle-app-');

      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --language kotlin`,
      );

      const buildResult = await runNxCommandAsync(`build ${appName}`);
      expect(buildResult.stdout).toContain('Executor ran for Build');

      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('--an app with aliases', async () => {
    const randomName = uniq('quarkus-gradle-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:app ${randomName} --framework quarkus --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
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
    const randomName = uniq('quarkus-gradle-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework quarkus --directory deep/sub-dir --port ${port}`,
    );

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
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
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --groupId org.acme`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle`,
        `${libName}/src/main/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libName}/src/test/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/java/.gitkeep`,
        `${libName}/src/test/java/.gitkeep`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${libName}/build.gradle`);
    expect(buildGradle.includes('org.acme')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`${libName}/build`)).not.toThrow();

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${libName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 120000);

  it('should create a kotlin library', async () => {
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --language kotlin --groupId org.acme`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle`,
        `${libName}/src/main/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `${libName}/src/test/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/kotlin/.gitkeep`,
        `${libName}/src/test/kotlin/.gitkeep`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${libName}/build.gradle`);
    expect(buildGradle.includes('org.acme')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`${libName}/build`)).not.toThrow();

    // const formatResult = await runNxCommandAsync(`ktformat ${libName}`);
    // expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 240000);

  it('should create a library with the specified properties', async () => {
    const randomName = uniq('quarkus-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework quarkus --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 240000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('quarkus-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework quarkus --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the correct information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 240000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('quarkus-gradle-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:lib ${randomName} --framework quarkus --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 240000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --groupId org.acme`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --projects ${appName} --groupId org.acme`,
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`${appName}/build.gradle`);
    expect(buildGradle.includes(`:${libName}`)).toBeTruthy();

    const greetingResourcePath = `${appName}/src/main/java/org/acme/${names(
      appName,
    ).className.toLocaleLowerCase()}/GreetingResource.java`;
    const greetingResourceContent = readFile(greetingResourcePath);

    const regex1 = /package\s*org\.acme\..*\s*;/;

    const regex2 = /public\s*class\s*GreetingResource\s*{/;

    const regex3 = /"Hello World!"/;

    const newGreetingResourceContent = greetingResourceContent
      .replace(
        regex1,
        `$&\nimport jakarta.inject.Inject;\nimport org.acme.${names(
          libName,
        ).className.toLocaleLowerCase()}.GreetingService;`,
      )
      .replace(regex2, '$&\n@Inject\nGreetingService service;')
      .replace(regex3, 'service.greeting()');

    updateFile(greetingResourcePath, newGreetingResourceContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

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

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --language kotlin --groupId org.acme`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --language kotlin --projects ${appName} --groupId org.acme`,
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`${appName}/build.gradle`);
    expect(buildGradle.includes(`:${libName}`)).toBeTruthy();

    const greetingResourcePath = `${appName}/src/main/kotlin/org/acme/${names(
      appName,
    ).className.toLocaleLowerCase()}/GreetingResource.kt`;
    const greetingResourceContent = readFile(greetingResourcePath);

    const regex1 = /package\s*org\.acme\..*/;

    const regex2 = /class\s*GreetingResource/;

    const regex3 = /"Hello World!"/;

    const newGreetingResourceContent = greetingResourceContent
      .replace(
        regex1,
        `$&\nimport org.acme.${names(
          libName,
        ).className.toLocaleLowerCase()}.GreetingService`,
      )
      .replace(regex2, '$&(private val greetingService: GreetingService)')
      .replace(regex3, 'greetingService.greeting()');

    updateFile(greetingResourcePath, newGreetingResourceContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    // const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    // expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

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

  it('should create an application with simple name', async () => {
    const appName = uniq('quarkus-gradle-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${appName}/build.gradle`,
        `${appDir}/${appName}/src/main/resources/application.yml`,
        `${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${appName}/src/test/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${appDir}/${appName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${appName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`,
    );
    expect(formatResult.stdout).toContain('');

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: rootProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should create a library with simple name', async () => {
    const libName = uniq('quarkus-gradle-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${libName}/build.gradle`,
        `${libDir}/${libName}/src/main/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle file contains the good information
    const buildGradle = readFile(`${libDir}/${libName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${libDir}/${libName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

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

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: rootProjectName,
    });
  }, 240000);

  it('should skip starter code when generating a java application with minimal option', async () => {
    const appName = uniq('quarkus-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --minimal`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/.gitkeep`,
        `${appName}/src/test/java/.gitkeep`,
        `${appName}/src/native-test/java/.gitkeep`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appName}/src/test/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
        `${appName}/src/native-test/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceIT.java`,
      ),
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin application with minimal option', async () => {
    const appName = uniq('quarkus-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework quarkus --language kotlin --minimal`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/.gitkeep`,
        `${appName}/src/test/kotlin/.gitkeep`,
        `${appName}/src/native-test/kotlin/.gitkeep`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.kt`,
        `${appName}/src/test/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.kt`,
        `${appName}/src/native-test/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceIT.kt`,
      ),
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a java library with skipStarterCode option', async () => {
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --skipStarterCode`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle`,
        `${libName}/src/main/java/.gitkeep`,
        `${libName}/src/test/java/.gitkeep`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libName}/src/test/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libName = uniq('quarkus-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework quarkus --language kotlin --skipStarterCode`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle`,
        `${libName}/src/main/kotlin/.gitkeep`,
        `${libName}/src/test/kotlin/.gitkeep`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `${libName}/src/test/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`,
      ),
    ).not.toThrow();
  }, 120000);
});
