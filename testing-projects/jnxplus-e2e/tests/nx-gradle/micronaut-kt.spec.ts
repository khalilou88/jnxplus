import { normalizeName } from '@jnxplus/common';
import {
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

describe('nx-gradle micronaut kotlin dsl e2e', () => {
  let workspaceDirectory: string;
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const rootProjectName = uniq('micronaut-root-project-');

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
      `generate @jnxplus/nx-gradle:init --dsl kotlin --rootProjectName ${rootProjectName} --preset micronaut`,
    );

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

  it('should create a java application', async () => {
    const appName = uniq('micronaut-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle.kts`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

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
      const appName = uniq('micronaut-gradle-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut`,
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName} --useDocker`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('micronaut-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework micronaut --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle.kts`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    // expect(buildGradle.includes('war')).toBeTruthy();
    // expect(
    //   buildGradle.includes(
    //     'org.springframework.boot:spring-boot-starter-tomcat'
    //   )
    // ).toBeTruthy();

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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('micronaut-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework micronaut --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle.kts`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the correct information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    // expect(buildGradle.includes('war')).toBeTruthy();
    // expect(
    //   buildGradle.includes(
    //     'org.springframework.boot:spring-boot-starter-tomcat'
    //   )
    // ).toBeTruthy();

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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a kotlin application', async () => {
    const appName = uniq('micronaut-gradle-app-');
    const port = 8383;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --language kotlin --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle.kts`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.kt`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.kt`,
        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${names(appName).className}Test.kt`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.kt`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  xit('should build-image a kotlin application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('micronaut-gradle-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --language kotlin`,
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName} --useDocker`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 120000);

  it('--an app with aliases', async () => {
    const randomName = uniq('micronaut-gradle-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:app ${randomName} --framework micronaut --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/build.gradle.kts`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${appDir}/${randomName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    // expect(buildGradle.includes('war')).toBeTruthy();
    // expect(
    //   buildGradle.includes(
    //     'org.springframework.boot:spring-boot-starter-tomcat'
    //   )
    // ).toBeTruthy();

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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('directory with dash', async () => {
    const randomName = uniq('micronaut-gradle-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${randomName} --framework micronaut --directory deep/sub-dir --port ${port}`,
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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library', async () => {
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle.kts`,
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
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
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --language kotlin`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/build.gradle.kts`,
        `${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.kt`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
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
  }, 120000);

  it('should create a library with the specified properties', async () => {
    const randomName = uniq('micronaut-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework micronaut --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle.kts`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle.kts`);
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
  }, 120000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('micronaut-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${randomName} --framework micronaut --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle.kts`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the correct information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle.kts`);
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
  }, 120000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('micronaut-gradle-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-gradle:lib ${randomName} --framework micronaut --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/build.gradle.kts`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${libDir}/${randomName}/build.gradle.kts`);
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
  }, 120000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('micronaut-gradle-app-');
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --projects ${appName}`,
    );

    // Making sure the app build.gradle.kts file contains the lib
    const buildGradle = readFile(`${appName}/build.gradle.kts`);
    expect(buildGradle.includes(`:${libName}`)).toBeTruthy();

    const helloControllerPath = `${appName}/src/main/java/com/example/${names(
      appName,
    ).className.toLocaleLowerCase()}/HelloController.java`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*\s*;/;

    const regex2 = /public\s*class\s*HelloController\s*{/;

    const regex3 = /"Hello World"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport jakarta.inject.Inject;\nimport com.example.${names(
          libName,
        ).className.toLocaleLowerCase()}.HelloService;`,
      )
      .replace(regex2, '$&\n@Inject\nprivate HelloService helloService;')
      .replace(regex3, 'this.helloService.greeting()');

    updateFile(helloControllerPath, newHelloControllerContent);

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
  }, 120000);

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('micronaut-gradle-app-');
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --language kotlin --packaging war`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --language kotlin --projects ${appName}`,
    );

    // Making sure the app build.gradle.kts file contains the lib
    const buildGradle = readFile(`${appName}/build.gradle.kts`);
    expect(buildGradle.includes(`:${libName}`)).toBeTruthy();

    const helloControllerPath = `${appName}/src/main/kotlin/com/example/${names(
      appName,
    ).className.toLocaleLowerCase()}/HelloController.kt`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*/;

    const regex2 = /class\s*HelloController/;

    const regex3 = /"Hello World"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport jakarta.inject.Inject\nimport com.example.${names(
          libName,
        ).className.toLocaleLowerCase()}.HelloService`,
      )
      .replace(regex2, '$&(@Inject val helloService: HelloService)')
      .replace(regex3, 'helloService.greeting()');

    updateFile(helloControllerPath, newHelloControllerContent);

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
  }, 120000);

  it('should create an application with a simple name', async () => {
    const appName = uniq('micronaut-gradle-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${appName}/build.gradle.kts`,
        `${appDir}/${appName}/src/main/resources/application.yml`,
        `${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `${appDir}/${appName}/src/test/resources/application.yml`,
        `${appDir}/${appName}/src/test/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${appDir}/${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    // expect(buildGradle.includes('war')).toBeTruthy();
    // expect(
    //   buildGradle.includes(
    //     'org.springframework.boot:spring-boot-starter-tomcat'
    //   )
    // ).toBeTruthy();

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
      output.includes(`Server Running: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library with a simple name', async () => {
    const libName = uniq('micronaut-gradle-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${libName}/build.gradle.kts`,
        `${libDir}/${libName}/src/main/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the build.gradle.kts file contains the good information
    const buildGradle = readFile(`${libDir}/${libName}/build.gradle.kts`);
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
  }, 120000);

  it('should create a minimal java application', async () => {
    const appName = uniq('micronaut-gradle-app-');
    const port = 8787;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --minimal --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle.kts`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${names(appName).className}Test.java`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Server Running: http://localhost:${port}`),
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
    const appName = uniq('micronaut-gradle-app-');
    const port = 8888;

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:application ${appName} --framework micronaut --language kotlin --minimal --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/build.gradle.kts`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.kt`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${names(appName).className}Test.kt`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.kt`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.kt`,
      ),
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Server Running: http://localhost:${port}`),
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
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --skipStarterCode`,
    );

    expect(() => checkFilesExist(`${libName}/build.gradle.kts`)).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libName = uniq('micronaut-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:library ${libName} --framework micronaut --language kotlin --skipStarterCode`,
    );

    expect(() => checkFilesExist(`${libName}/build.gradle.kts`)).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `${libName}/src/test/resources/junit-platform.properties`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.kt`,
      ),
    ).not.toThrow();
  }, 120000);
});
