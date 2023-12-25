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

describe('nx-maven spring-boot-parent-pom e2e', () => {
  let workspaceDirectory: string;
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const parentProjectName = uniq('boot-parent-project-');

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
      `generate @jnxplus/nx-maven:init --parentProjectName ${parentProjectName} --dependencyManagement spring-boot-parent-pom --localRepositoryRelativePath .m2/repository`,
    );

    if (isCI) {
      removeTmpFromGitignore();
    }
  }, 240000);

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

  it('should create a java application', async () => {
    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`${appName}/target`)).not.toThrow();

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', appName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`${appName}/target`)).not.toThrow();

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
        executor: '@jnxplus/nx-maven:run-task',
      },
    };
    updateFile(`${appName}/project.json`, JSON.stringify(projectJson));
    const runTaskResult = await runNxCommandAsync(
      `run-task ${appName} --task="clean install -DskipTests=true"`,
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
      target: parentProjectName,
    });

    expect(
      depGraphJson.graph.nodes[parentProjectName].data.targets.build.options
        .task,
    ).toEqual('install -N');

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port 8080`),
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
  }, 240000);

  it('should build-image a java application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('boot-maven-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot`,
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 240000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('boot-maven-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework spring-boot --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();
    expect(pomXml.includes('war')).toBeTruthy();
    expect(pomXml.includes('spring-boot-starter-tomcat')).toBeTruthy();

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
  }, 240000);

  it('should create a kotlin application', async () => {
    const appName = uniq('boot-maven-app-');
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --language kotlin --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.kt`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.kt`,

        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.kt`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', appName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`${appName}/target`)).not.toThrow();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should build-image a kotlin application', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appName = uniq('boot-maven-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --language kotlin`,
      );
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 240000);

  it('--an app with aliases', async () => {
    const randomName = uniq('boot-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8383;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:app ${randomName} --framework spring-boot --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();
    expect(pomXml.includes('war')).toBeTruthy();
    expect(pomXml.includes('spring-boot-starter-tomcat')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
      target: parentProjectName,
    });
  }, 240000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('boot-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:app ${randomName} --framework spring-boot --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --simplePackageName --v 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/ServletInitializer.java`,
        `${appDir}/${randomName}/src/test/resources/application.yml`,
        `${appDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const buildmaven = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(buildmaven.includes('com.jnxplus')).toBeTruthy();
    expect(buildmaven.includes('1.2.3')).toBeTruthy();
    expect(buildmaven.includes('war')).toBeTruthy();
    expect(buildmaven.includes('spring-boot-starter-tomcat')).toBeTruthy();

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
  }, 240000);

  it('directory with dash', async () => {
    const randomName = uniq('boot-maven-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework spring-boot --directory deep/sub-dir --port ${port}`,
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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
  }, 240000);

  it('should create a library', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', libName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`${libName}/target`)).not.toThrow();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should create a kotlin library outputDirLocalRepo', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --language kotlin`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/TestConfiguration.kt`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.kt`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`${libName}/target`)).not.toThrow();
    expect(() =>
      checkFilesExist(`.m2/repository/com/example/${libName}/0.0.1-SNAPSHOT`),
    ).not.toThrow();

    //should recreate target folder and outputDirLocalRepo
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', libName, 'target');
    fse.removeSync(targetDir);
    const outputDirLocalRepo = path.join(
      localTmpDir,
      'proj',
      `.m2/repository/com/example/${libName}/0.0.1-SNAPSHOT`,
    );
    fse.removeSync(outputDirLocalRepo);
    expect(() => checkFilesExist(`${libName}/target`)).toThrow();
    expect(() =>
      checkFilesExist(`.m2/repository/com/example/${libName}/0.0.1-SNAPSHOT`),
    ).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`${libName}/target`)).not.toThrow();
    expect(() =>
      checkFilesExist(`.m2/repository/com/example/${libName}/0.0.1-SNAPSHOT`),
    ).not.toThrow();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should use the the specified properties to create a library', async () => {
    const randomName = uniq('boot-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework spring-boot --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('boot-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework spring-boot --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --simplePackageName --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      target: parentProjectName,
    });
  }, 240000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('boot-maven-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:lib ${randomName} --framework spring-boot --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should add a lib to an app dependencies', async () => {
    const port = 9090;
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --port ${port}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --projects ${appName}`,
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

    const helloControllerPath = `${appName}/src/main/java/com/example/${names(
      appName,
    ).className.toLocaleLowerCase()}/HelloController.java`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*\s*;/;

    const regex2 = /public\s*class\s*HelloController\s*{/;

    const regex3 = /"Hello World!"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport org.springframework.beans.factory.annotation.Autowired;\nimport com.example.${names(
          libName,
        ).className.toLocaleLowerCase()}.HelloService;`,
      )
      .replace(regex2, '$&\n@Autowired\nprivate HelloService helloService;')
      .replace(regex3, 'this.helloService.message()');

    updateFile(helloControllerPath, newHelloControllerContent);

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
    expect(depGraphJson.graph.nodes[appName]).toBeDefined();
    expect(depGraphJson.graph.nodes[libName]).toBeDefined();

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: libName,
    });
  }, 240000);

  it('should test an app with a lib', async () => {
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --projects ${appName}`,
    );

    const helloControllerPath = `${appName}/src/main/java/com/example/${names(
      appName,
    ).className.toLocaleLowerCase()}/HelloController.java`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*\s*;/;

    const regex2 = /public\s*class\s*HelloController\s*{/;

    const regex3 = /"Hello World!"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport org.springframework.beans.factory.annotation.Autowired;\nimport com.example.${names(
          libName,
        ).className.toLocaleLowerCase()}.HelloService;`,
      )
      .replace(regex2, '$&\n@Autowired\nprivate HelloService helloService;')
      .replace(regex3, 'this.helloService.message()');

    updateFile(helloControllerPath, newHelloControllerContent);

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult2 = await runNxCommandAsync(`test ${libName}`);
    expect(testResult2.stdout).toContain('Executor ran for Test');
  }, 240000);

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --language kotlin --packaging war`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --language kotlin --projects ${appName}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/ServletInitializer.kt`,
      ),
    ).not.toThrow();

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

    const helloControllerPath = `${appName}/src/main/kotlin/com/example/${names(
      appName,
    ).className.toLocaleLowerCase()}/HelloController.kt`;
    const helloControllerContent = readFile(helloControllerPath);

    const regex1 = /package\s*com\.example\..*/;

    const regex2 = /class\s*HelloController/;

    const regex3 = /"Hello World!"/;

    const newHelloControllerContent = helloControllerContent
      .replace(
        regex1,
        `$&\nimport org.springframework.beans.factory.annotation.Autowired\nimport com.example.${names(
          libName,
        ).className.toLocaleLowerCase()}.HelloService`,
      )
      .replace(regex2, '$&(@Autowired val helloService: HelloService)')
      .replace(regex3, 'helloService.message()');

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
    expect(depGraphJson.graph.nodes[appName]).toBeDefined();
    expect(depGraphJson.graph.nodes[libName]).toBeDefined();

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: libName,
    });
  }, 240000);

  it("should dep-graph don't crash when pom.xml don't contains dependencies tag", async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot`,
    );

    const regex = /<dependencies>[\s\S]*?<\/dependencies>/;
    const pomXml = `${libName}/pom.xml`;
    const pomXmlContent = readFile(pomXml);
    const updatedPomXmlContent = pomXmlContent.replace(regex, '');
    updateFile(pomXml, updatedPomXmlContent);

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
      target: parentProjectName,
    });
  }, 240000);

  it('should generate java apps that use a parent project', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none`,
    );

    const randomName = uniq('boot-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework spring-boot --parent-project ${appsParentProject} --directory ${appDir}`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework spring-boot --parent-project ${secondParentProject}`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject}  --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework spring-boot --parent-project ${thirdParentProject}`,
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appsParentProject]).toContainEqual({
      type: 'static',
      source: appsParentProject,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: appsParentProject,
    });

    expect(depGraphJson.graph.dependencies[secondParentProject]).toContainEqual(
      {
        type: 'static',
        source: secondParentProject,
        target: appsParentProject,
      },
    );

    expect(depGraphJson.graph.dependencies[secondAppName]).toContainEqual({
      type: 'static',
      source: secondAppName,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdParentProject]).toContainEqual({
      type: 'static',
      source: thirdParentProject,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdAppName]).toContainEqual({
      type: 'static',
      source: thirdAppName,
      target: thirdParentProject,
    });
  }, 240000);

  it('should generate kotlin apps that use a parent project', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none`,
    );

    const randomName = uniq('boot-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework spring-boot --parent-project ${appsParentProject} --directory ${appDir} --language kotlin`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework spring-boot --parent-project ${secondParentProject} --language kotlin`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject}  --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework spring-boot --parent-project ${thirdParentProject} --language kotlin`,
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appsParentProject]).toContainEqual({
      type: 'static',
      source: appsParentProject,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: appsParentProject,
    });

    expect(depGraphJson.graph.dependencies[secondParentProject]).toContainEqual(
      {
        type: 'static',
        source: secondParentProject,
        target: appsParentProject,
      },
    );

    expect(depGraphJson.graph.dependencies[secondAppName]).toContainEqual({
      type: 'static',
      source: secondAppName,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdParentProject]).toContainEqual({
      type: 'static',
      source: thirdParentProject,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdAppName]).toContainEqual({
      type: 'static',
      source: thirdAppName,
      target: thirdParentProject,
    });
  }, 240000);

  it('should generate java libs that use a parent project', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework none`,
    );

    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --parent-project ${libsParentProject}`,
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --projectType library  --parent-project ${libsParentProject} --framework none`,
    );

    const randomName = uniq('boot-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework spring-boot --parent-project ${secondParentProject} --dir ${libDir}`,
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentProject} --directory ${parentProjectDir} --framework none`,
    );

    const thirdLibName = uniq('boot-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${thirdLibName} --framework spring-boot --parent-project ${thirdParentProject}`,
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libsParentProject]).toContainEqual({
      type: 'static',
      source: libsParentProject,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: libsParentProject,
    });

    expect(depGraphJson.graph.dependencies[secondParentProject]).toContainEqual(
      {
        type: 'static',
        source: secondParentProject,
        target: libsParentProject,
      },
    );

    expect(depGraphJson.graph.dependencies[secondLibName]).toContainEqual({
      type: 'static',
      source: secondLibName,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdParentProject]).toContainEqual({
      type: 'static',
      source: thirdParentProject,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdLibName]).toContainEqual({
      type: 'static',
      source: thirdLibName,
      target: thirdParentProject,
    });
  }, 240000);

  it('should generate kotlin libs that use a parent project', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework none`,
    );

    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --parent-project ${libsParentProject} --language kotlin`,
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --projectType library  --parent-project ${libsParentProject} --framework none`,
    );

    const randomName = uniq('boot-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework spring-boot --parent-project ${secondParentProject} --dir ${libDir} --language kotlin`,
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentProject}  --directory ${parentProjectDir} --framework none`,
    );

    const thirdLibName = uniq('boot-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${thirdLibName} --framework spring-boot --parent-project ${thirdParentProject} --language kotlin`,
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[libsParentProject]).toContainEqual({
      type: 'static',
      source: libsParentProject,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[libName]).toContainEqual({
      type: 'static',
      source: libName,
      target: libsParentProject,
    });

    expect(depGraphJson.graph.dependencies[secondParentProject]).toContainEqual(
      {
        type: 'static',
        source: secondParentProject,
        target: libsParentProject,
      },
    );

    expect(depGraphJson.graph.dependencies[secondLibName]).toContainEqual({
      type: 'static',
      source: secondLibName,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdParentProject]).toContainEqual({
      type: 'static',
      source: thirdParentProject,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdLibName]).toContainEqual({
      type: 'static',
      source: thirdLibName,
      target: thirdParentProject,
    });
  }, 240000);

  it('should create an application with a simple name', async () => {
    const appName = uniq('boot-maven-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${appName}/pom.xml`,
        `${appDir}/${appName}/src/main/resources/application.yml`,
        `${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appDir}/${appName}/src/main/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `${appDir}/${appName}/src/test/resources/application.yml`,
        `${appDir}/${appName}/src/test/java/com/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appDir}/${appName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();
    expect(pomXml.includes('war')).toBeTruthy();
    expect(pomXml.includes('spring-boot-starter-tomcat')).toBeTruthy();

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
  }, 240000);

  it('should create a library with a simple name', async () => {
    const libName = uniq('boot-maven-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${libName}/pom.xml`,
        `${libDir}/${libName}/src/main/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libDir}/${libName}/src/test/java/com/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${libName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      target: parentProjectName,
    });
  }, 240000);

  it('should create a minimal java application', async () => {
    const appName = uniq('boot-maven-app-');
    const port = 8787;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --minimal --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }ApplicationTests.java`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appName}/src/test/resources/application.properties`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should create a minimal kotlin application', async () => {
    const appName = uniq('boot-maven-app-');
    const port = 8888;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --language kotlin --minimal --port ${port}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.kt`,
        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }ApplicationTests.kt`,
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/ServletInitializer.kt`,
        `${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.kt`,
        `${appName}/src/test/resources/application.properties`,

        `${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.kt`,
      ),
    ).not.toThrow();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 240000);

  it('should skip starter code when generating a java library with skipStarterCode option', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --skipStarterCode`,
    );

    expect(() => checkFilesExist(`${libName}/pom.xml`)).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`,
      ),
    ).not.toThrow();
  }, 240000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework spring-boot --language kotlin --skipStarterCode`,
    );

    expect(() => checkFilesExist(`${libName}/pom.xml`)).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.kt`,
        `${libName}/src/test/resources/junit-platform.properties`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/TestConfiguration.kt`,
        `${libName}/src/test/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTests.kt`,
      ),
    ).not.toThrow();
  }, 240000);

  it('should generate java app inside a parent project', async () => {
    const parentProject = uniq('parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${parentProject} --framework none`,
    );

    const randomName = uniq('boot-maven-app-');
    const appName = `${parentProject}-${randomName}`;
    const port = 8989;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework spring-boot --parent-project ${parentProject} --directory ${parentProject} --port ${port}`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

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
      target: parentProject,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Tomcat started on port ${port}`),
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
  }, 240000);

  it('should generate java nested sub-projects', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none`,
    );

    const appName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework spring-boot --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject}`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework spring-boot --simpleName --parent-project ${secondParentProject} --directory ${appsParentProject}/${secondParentProject}`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const thirdParentProject = uniq('apps-parent-project-');
    const parentProjectDir = `${appsParentProject}/${secondParentProject}/deep/subdir`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${thirdParentProject} --simpleName --parent-project ${secondParentProject}  --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework spring-boot --parent-project ${thirdParentProject}`,
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const localTmpDir = path.dirname(tmpProjPath());
    const projectJson1 = path.join(
      localTmpDir,
      'proj',
      appsParentProject,
      'project.json',
    );
    fse.removeSync(projectJson1);
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
    const depGraphJson = readJson('dep-graph.json');
    expect(depGraphJson.graph.dependencies[appsParentProject]).toContainEqual({
      type: 'static',
      source: appsParentProject,
      target: parentProjectName,
    });

    expect(depGraphJson.graph.dependencies[appName]).toContainEqual({
      type: 'static',
      source: appName,
      target: appsParentProject,
    });

    expect(depGraphJson.graph.dependencies[secondParentProject]).toContainEqual(
      {
        type: 'static',
        source: secondParentProject,
        target: appsParentProject,
      },
    );

    expect(depGraphJson.graph.dependencies[secondAppName]).toContainEqual({
      type: 'static',
      source: secondAppName,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdParentProject]).toContainEqual({
      type: 'static',
      source: thirdParentProject,
      target: secondParentProject,
    });

    expect(depGraphJson.graph.dependencies[thirdAppName]).toContainEqual({
      type: 'static',
      source: thirdAppName,
      target: thirdParentProject,
    });
  }, 240000);

  it('optional project.json', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none`,
    );

    //graph
    const localTmpDir = path.dirname(tmpProjPath());
    const projectJson1 = path.join(
      localTmpDir,
      'proj',
      appsParentProject,
      'project.json',
    );
    fse.removeSync(projectJson1);
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`,
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph',
    );
  }, 240000);
});
