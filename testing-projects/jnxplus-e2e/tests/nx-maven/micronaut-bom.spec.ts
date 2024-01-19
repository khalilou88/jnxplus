import {
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

describe('nx-maven micronaut bom e2e', () => {
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

  it('should create a java application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework micronaut`,
    );

    const appName = uniq('micronaut-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework micronaut --parentProject ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${appName}/pom.xml`,
        `${appName}/src/main/resources/application.properties`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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
      output.includes(`Server Running: http://localhost:8080`),
    );

    const dataResult = await getData(8080, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    await killProcessAndPorts(process.pid, 8080);
  }, 240000);

  it('should create a micronaut library', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework micronaut`,
    );

    const libName = uniq('micronaut-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework micronaut --parentProject ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `${libName}/pom.xml`,
        `${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', libName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`${libName}/target`)).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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

  it('should create a micronaut kotlin application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework micronaut`,
    );

    const appName = uniq('micronaut-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework micronaut --language kotlin --parentProject ${appsParentProject}`,
    );

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Server Running: http://localhost:8080`),
    );

    const dataResult = await getData(8080, '/hello');
    expect(dataResult.status).toEqual(200);
    expect(dataResult.message).toMatch('Hello World');

    // port and process cleanup
    await killProcessAndPorts(process.pid, 8080);
  }, 240000);

  it('micronaut: should add a lib to an app dependencies', async () => {
    const parentProject = uniq('parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${parentProject} --framework micronaut --language kotlin`,
    );

    const appName = uniq('micronaut-maven-app-');
    const libName = uniq('micronaut-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework micronaut --parentProject ${parentProject}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework micronaut --projects ${appName} --parentProject ${parentProject}`,
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

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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

  it('micronaut: should add a kotlin lib to a kotlin app dependencies', async () => {
    const parentProject = uniq('parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${parentProject} --framework micronaut --language kotlin`,
    );

    const appName = uniq('micronaut-maven-app-');
    const libName = uniq('micronaut-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --framework micronaut --language kotlin --packaging war --parentProject ${parentProject}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework micronaut --language kotlin --projects ${appName} --parentProject ${parentProject}`,
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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
});
