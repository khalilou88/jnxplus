import { normalizeName } from '@jnxplus/common';
import {
  addTmpToGitignore,
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

describe('nx-maven spring-boot bom e2e', () => {
  let workspaceDirectory: string;
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
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
      `generate @jnxplus/nx-maven:init --parentProjectName ${parentProjectName}`,
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
  }, 120000);

  it('spring-boot: should create a java application', async () => {
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
      output.includes(`Tomcat started on port(s): 8080`),
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

  it('spring-boot: should add a lib to an app dependencies', async () => {
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
  }, 120000);

  it('spring-boot: should add a kotlin lib to a kotlin app dependencies', async () => {
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
      output.includes(`Tomcat started on port(s): ${port}`),
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
});
