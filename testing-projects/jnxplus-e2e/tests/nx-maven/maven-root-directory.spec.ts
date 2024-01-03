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

describe('nx-maven maven-root-directory e2e', () => {
  let workspaceDirectory: string;

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
      `generate @jnxplus/nx-maven:init --parentProjectName ${parentProjectName} --mavenRootDirectory nx-maven`,
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
        'nx-maven/.mvn/wrapper/maven-wrapper.jar',
        'nx-maven/.mvn/wrapper/maven-wrapper.properties',
        'nx-maven/mvnw',
        'nx-maven/mvnw.cmd',
        'nx-maven/pom.xml',
      ),
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
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
        `nx-maven/${appName}/pom.xml`,
        `nx-maven/${appName}/src/main/resources/application.properties`,
        `nx-maven/${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/App.java`,
        `nx-maven/${appName}/src/test/resources/application.properties`,
        `nx-maven/${appName}/src/test/java/com/example/${names(
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

    // const projectJson = readJson(`nx-maven/${appName}/project.json`);
    // projectJson.targets = {
    //   ...projectJson.targets,
    //   lint: {
    //     executor: '@jnxplus/nx-checkstyle:lint',
    //   },
    // };
    // updateFile(`nx-maven/${appName}/project.json`, JSON.stringify(projectJson));
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
        `nx-maven/${appName}/pom.xml`,
        `nx-maven/${appName}/src/main/resources/application.properties`,
        `nx-maven/${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/App.kt`,
        `nx-maven/${appName}/src/test/resources/application.properties`,
        `nx-maven/${appName}/src/test/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/AppTest.kt`,
      ),
    ).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    // const projectJson = readJson(`nx-maven/${appName}/project.json`);
    // projectJson.targets = {
    //   ...projectJson.targets,
    //   ktformat: {
    //     executor: '@jnxplus/nx-ktlint:ktformat',
    //   },
    //   lint: {
    //     executor: '@jnxplus/nx-ktlint:lint',
    //   },
    // };
    // updateFile(`nx-maven/${appName}/project.json`, JSON.stringify(projectJson));

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
        `nx-maven/${libName}/pom.xml`,
        `nx-maven/${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/Library.java`,
        `nx-maven/${libName}/src/test/java/com/example/${names(
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

    const showProjectResult = await runNxCommandAsync(
      `show project ${libName} --json`,
    );
    const projectJson = JSON.parse(showProjectResult.stdout);
    expect(Object.entries(projectJson.targets).length).toBe(2);
    expect(projectJson.targets.build.outputs).toEqual([
      '{projectRoot}/target',
      '{options.outputDirLocalRepo}',
    ]);
    expect(projectJson.targets.build.options.outputDirLocalRepo).toBeTruthy();
  }, 240000);

  it('2 none lib kt', async () => {
    const libName = uniq('maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --framework none --language kotlin --parentProject ${parentProjectName}`,
    );

    expect(() =>
      checkFilesExist(
        `nx-maven/${libName}/pom.xml`,
        `nx-maven/${libName}/src/main/kotlin/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/Library.kt`,
        `nx-maven/${libName}/src/test/kotlin/com/example/${names(
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

  it('should create a java application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject}`,
    );

    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --parentProject ${appsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `nx-maven/${appName}/pom.xml`,
        `nx-maven/${appName}/src/main/resources/application.properties`,
        `nx-maven/${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `nx-maven/${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `nx-maven/${appName}/src/test/resources/application.properties`,
        `nx-maven/${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`nx-maven/${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(
      localTmpDir,
      'proj',
      'nx-maven',
      appName,
      'target',
    );
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

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
    await killProcessAndPorts(process.pid, 8080);
  }, 240000);

  it('should use specified options to create a quarkus application', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --framework quarkus`,
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${randomName}  --parentProject ${appsParentProject} --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port}  --framework quarkus`,
    );

    expect(() =>
      checkFilesExist(
        `nx-maven/${appDir}/${randomName}/pom.xml`,
        `nx-maven/${appDir}/${randomName}/src/main/resources/application.yml`,
        `nx-maven/${appDir}/${randomName}/src/main/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `nx-maven/${appDir}/${randomName}/src/test/java/org/jnxplus/deep/subdir/${names(
          randomName,
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`nx-maven/${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(
      `nx-maven/${appDir}/${randomName}/project.json`,
    );
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

  it('should add a lib to an app dependencies', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library`,
    );

    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --parentProject ${libsParentProject} --framework none`,
    );

    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --parentProject ${appsParentProject}`,
    );

    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --projects ${appName} --parentProject ${libsParentProject}`,
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`nx-maven/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

    const helloControllerPath = `nx-maven/${appName}/src/main/java/com/example/${names(
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

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --language kotlin`,
    );

    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${appsParentProject} --parentProject ${libsParentProject} --framework none`,
    );

    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:application ${appName} --language kotlin --packaging war --parentProject ${appsParentProject}`,
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --language kotlin --projects ${appName} --parentProject ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `nx-maven/${appName}/src/main/kotlin/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/ServletInitializer.kt`,
      ),
    ).not.toThrow();

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`nx-maven/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

    const helloControllerPath = `nx-maven/${appName}/src/main/kotlin/com/example/${names(
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

  it('should create a quarkus kotlin library', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:parent-project ${libsParentProject} --projectType library --framework quarkus`,
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-maven:library ${libName} --language kotlin --groupId org.acme --framework quarkus --parentProject ${libsParentProject}`,
    );

    expect(() =>
      checkFilesExist(
        `nx-maven/${libName}/pom.xml`,
        `nx-maven/${libName}/src/main/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `nx-maven/${libName}/src/test/kotlin/org/acme/${names(
          libName,
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`nx-maven/${libName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(
      localTmpDir,
      'proj',
      'nx-maven',
      libName,
      'target',
    );
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`nx-maven/${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`nx-maven/${libName}/target`)).not.toThrow();

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

  it('should create a micronaut java application', async () => {
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
        `nx-maven/${appName}/pom.xml`,
        `nx-maven/${appName}/src/main/resources/application.properties`,
        `nx-maven/${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/Application.java`,
        `nx-maven/${appName}/src/main/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloController.java`,
        `nx-maven/${appName}/src/test/java/com/example/${names(
          appName,
        ).className.toLocaleLowerCase()}/HelloControllerTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`nx-maven/${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(
      localTmpDir,
      'proj',
      'nx-maven',
      appName,
      'target',
    );
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

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
    await killProcessAndPorts(process.pid, port);
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
        `nx-maven/${libName}/pom.xml`,
        `nx-maven/${libName}/src/main/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `nx-maven/${libName}/src/test/java/com/example/${names(
          libName,
        ).className.toLocaleLowerCase()}/HelloServiceTest.java`,
      ),
    ).not.toThrow();

    // Making sure the pom.xml file contains the correct information
    const pomXml = readFile(`nx-maven/${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(
      localTmpDir,
      'proj',
      'nx-maven',
      libName,
      'target',
    );
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`nx-maven/${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`nx-maven/${libName}/target`)).not.toThrow();

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
    const pomXml = readFile(`nx-maven/${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(
      localTmpDir,
      'proj',
      'nx-maven',
      appName,
      'target',
    );
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`nx-maven/${appName}/target`)).not.toThrow();

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
});
