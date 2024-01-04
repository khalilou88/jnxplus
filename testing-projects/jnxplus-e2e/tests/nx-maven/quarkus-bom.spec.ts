import { normalizeName } from '@jnxplus/common';
import {
  checkFilesDoNotExist,
  createTestWorkspace,
  getData,
  killProcessAndPorts,
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

describe('nx-maven quarkus bom e2e', () => {
  let workspaceDirectory: string;
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';

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
      `generate @jnxplus/nx-maven:init --parentProjectName ${parentProjectName} --dependencyManagement bom`,
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

  it('should create a java application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appName}/src/test/java/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
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

    const port = 8080;
    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);
  }, 240000);

  it('should build-image a java app', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appsParentProject = uniq('apps-parent-project-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
      );

      const appName = uniq('quarkus-maven-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --parent-project ${appsParentProject}`,
      );

      //test run-task
      const projectJson = readJson(`${appName}/project.json`);
      projectJson.targets = {
        ...projectJson.targets,
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          options: {
            task: 'package',
          },
        },
      };
      updateFile(`${appName}/project.json`, JSON.stringify(projectJson));
      //end test run-task

      await runNxCommandAsync(`build ${appName}`);
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 240000);

  it('should use specified options to create an application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework quarkus --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port} --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);

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

  it('should create a kotlin application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --language kotlin --port ${port} --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.kt`,
        `${appName}/src/test/kotlin/org/acme/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.kt`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);

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

  it('should build-image a kotlin app', async () => {
    if (!isWin && !isMacOs && isCI) {
      const appsParentProject = uniq('apps-parent-project-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
      );

      const appName = uniq('quarkus-maven-app-');
      await runNxCommandAsync(
        `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --language kotlin --parent-project ${appsParentProject}`,
      );

      //test run-task
      const projectJson = readJson(`${appName}/project.json`);
      projectJson.targets = {
        ...projectJson.targets,
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          options: {
            task: 'package',
          },
        },
      };
      updateFile(`${appName}/project.json`, JSON.stringify(projectJson));
      //end test run-task

      await runNxCommandAsync(`build ${appName}`);
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`,
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }
  }, 240000);

  it('--an app with aliases', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8383;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:app ${randomName} --framework quarkus --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --v 1.2.3 --configFormat .yml --port ${port} --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/org/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/org/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);
  }, 240000);

  it('should generate an app with a simple package name', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:app ${randomName} --framework quarkus --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --simplePackageName --v 1.2.3 --configFormat .yml --port ${port} --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${randomName}/pom.xml`,
        `${appDir}/${randomName}/src/main/resources/application.yml`,
        `${appDir}/${randomName}/src/main/java/org/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${randomName}/src/test/java/org/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const buildmaven = readFile(`${appDir}/${randomName}/pom.xml`);
    expect(buildmaven.includes('org.jnxplus')).toBeTruthy();
    expect(buildmaven.includes('1.2.3')).toBeTruthy();

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
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);
  }, 240000);

  it('directory with dash', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework quarkus --directory deep/sub-dir --port ${port} --parent-project ${appsParentProject}`,
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
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);
  }, 240000);

  it('should create a library', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --groupId org.acme --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libName}/src/test/java/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
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

  it('should create a kotlin library', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --groupId org.acme --language kotlin --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `${libName}/src/test/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
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
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework quarkus --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --projectVersion 1.2.3 --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
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
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework quarkus --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --simplePackageName --projectVersion 1.2.3 --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/org/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/org/jnxplus/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
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
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-maven:lib ${randomName} --framework quarkus --dir ${libDir} --t e2etag,e2ePackage --groupId org.jnxplus --v 1.2.3 --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${randomName}/pom.xml`,
        `${libDir}/${randomName}/src/main/java/org/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${randomName}/src/test/java/org/jnxplus/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
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
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none --parent-project ${libsParentProject}`,
    );

    const appName = uniq('quarkus-maven-app-');
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --parent-project ${appsParentProject}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --groupId org.acme --projects ${appName} --parent-project ${libsParentProject}`,
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework none --parent-project ${libsParentProject}`,
    );

    const appName = uniq('quarkus-maven-app-');
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --groupId org.acme --language kotlin --parent-project ${appsParentProject}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --groupId org.acme --language kotlin --projects ${appName} --parent-project ${libsParentProject}`,
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --parent-project ${libsParentProject}`,
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
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework quarkus --parent-project ${appsParentProject} --directory ${appDir}`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework quarkus --parent-project ${secondParentProject}`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject} --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework quarkus --parent-project ${thirdParentProject}`,
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
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName} --framework quarkus --parent-project ${appsParentProject} --directory ${appDir} --language kotlin`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework quarkus --parent-project ${secondParentProject} --language kotlin`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir,
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject} --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework quarkus --parent-project ${thirdParentProject} --language kotlin`,
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
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --parent-project ${libsParentProject}`,
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --projectType library  --parent-project ${libsParentProject} --framework none`,
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework quarkus --parent-project ${secondParentProject} --dir ${libDir}`,
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

    const thirdLibName = uniq('quarkus-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${thirdLibName} --framework quarkus --parent-project ${thirdParentProject}`,
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
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --parent-project ${libsParentProject} --language kotlin`,
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --projectType library --parent-project ${libsParentProject} --framework none`,
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${randomName} --framework quarkus --parent-project ${secondParentProject} --dir ${libDir} --language kotlin`,
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

    const thirdLibName = uniq('quarkus-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${thirdLibName} --framework quarkus --parent-project ${thirdParentProject} --language kotlin`,
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

  it('should create an application with simple name', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port} --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appDir}/${appName}/pom.xml`,
        `${appDir}/${appName}/src/main/resources/application.yml`,
        `${appDir}/${appName}/src/main/java/org/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `${appDir}/${appName}/src/test/java/org/jnxplus/deep/subdir/${names(
          appName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appDir}/${appName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

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
      output.includes(`Listening on: http://localhost:${port}`),
    );

    const dataResult = await getData(port, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World!');

    // port and process cleanup
    await killProcessAndPorts(process.pid, port);
  }, 240000);

  it('should create a library with a simple name', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --projectVersion 1.2.3 --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libDir}/${libName}/pom.xml`,
        `${libDir}/${libName}/src/main/java/org/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `${libDir}/${libName}/src/test/java/org/jnxplus/deep/subdir/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`${libDir}/${libName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
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

  it('should skip starter code when generating a java application with minimal option', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --minimal --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/.gitkeep`,
        `${appName}/src/test/java/.gitkeep`,
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
  }, 240000);

  it('should skip starter code when generating a kotlin application with minimal option', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --language kotlin --minimal --parent-project ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/kotlin/.gitkeep`,
        `${appName}/src/test/kotlin/.gitkeep`,
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
  }, 240000);

  it('should skip starter code when generating a java library with skipStarterCode option', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --skipStarterCode --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
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
  }, 240000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework quarkus --language kotlin --skipStarterCode --parent-project ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
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
  }, 240000);

  it('should generate java nested sub-projects', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const appName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework quarkus --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject}`,
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${secondParentProject} --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject} --framework none`,
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${secondAppName} --framework quarkus --simpleName --parent-project ${secondParentProject} --directory ${appsParentProject}/${secondParentProject}`,
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const thirdParentProject = uniq('apps-parent-project-');
    const parentProjectDir = `${appsParentProject}/${secondParentProject}/deep/subdir`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${thirdParentProject} --simpleName --parent-project ${secondParentProject}  --directory ${parentProjectDir} --framework none`,
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${thirdAppName} --framework quarkus --parent-project ${thirdParentProject}`,
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
});
