import { names } from '@nx/devkit';
import {
  checkFilesExist,
  cleanup,
  patchPackageJsonForPlugin,
  readFile,
  readJson,
  runNxCommandAsync,
  runPackageManagerInstall,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing';
import * as fse from 'fs-extra';
import * as path from 'path';
import {
  checkFilesDoNotExist,
  getData,
  killPorts,
  normalizeName,
  promisifiedTreeKill,
  runNxCommandUntil,
  runNxNewCommand,
} from '@jnxplus/common/testing';
import * as fs from 'fs';

describe('nx-quarkus-maven e2e', () => {
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const parentProjectName = uniq('quarkus-parent-project-');
  beforeAll(async () => {
    fse.ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand('', true);

    patchPackageJsonForPlugin(
      '@jnxplus/nx-quarkus-maven',
      'dist/packages/nx-quarkus-maven'
    );
    patchPackageJsonForPlugin(
      'prettier-plugin-java',
      'node_modules/prettier-plugin-java'
    );
    patchPackageJsonForPlugin(
      '@prettier/plugin-xml',
      'node_modules/@prettier/plugin-xml'
    );
    runPackageManagerInstall();

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:init --parentProjectName ${parentProjectName}`
    );

    if (isCI) {
      const filePath = `${process.cwd()}/.gitignore`;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const updatedFileContent = fileContent.replace('/tmp', '');
      fs.writeFileSync(filePath, updatedFileContent);
    }
  }, 120000);

  afterAll(() => {
    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    runNxCommandAsync('reset');
  });

  it('should init the workspace with @jnxplus/nx-quarkus-maven capabilities', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-quarkus-maven dependency
    const packageJson = readJson('package.json');
    expect(
      packageJson.devDependencies['@jnxplus/nx-quarkus-maven']
    ).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-quarkus-maven inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-quarkus-maven')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        '.mvn/wrapper/maven-wrapper.jar',
        '.mvn/wrapper/maven-wrapper.properties',
        'mvnw',
        'mvnw.cmd',
        'pom.xml',
        'tools/linters/checkstyle.xml',
        'tools/linters/pmd.xml'
      )
    ).not.toThrow();
  }, 120000);

  it('should migrate', async () => {
    await runNxCommandAsync(`generate @jnxplus/nx-quarkus-maven:migrate`);
  }, 120000);

  it('should create a java application', async () => {
    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/java/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appName}/src/test/java/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');
    expect(() => checkFilesExist(`apps/${appName}/target`)).not.toThrow();

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/target`)).not.toThrow();

    //build-image preparation
    await runNxCommandAsync(`build ${appName} --mvnBuildCommand="package"`);
    if (!isWin && !isMacOs && isCI) {
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

    //test run-task
    const projectJson = readJson(`apps/${appName}/project.json`);
    projectJson.targets = {
      ...projectJson.targets,
      'run-task': {
        executor: '@jnxplus/nx-quarkus-maven:run-task',
      },
    };
    updateFile(`apps/${appName}/project.json`, JSON.stringify(projectJson));
    const runTaskResult = await runNxCommandAsync(
      `run-task ${appName} --task="clean install -DskipTests=true"`
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
      target: parentProjectName,
    });

    const port = 8080;
    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    const port = 8181;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/pom.xml`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/org/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appDir}/${randomName}/src/test/java/org/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(
      `build ${appName} --mvnArgs='--no-transfer-progress'`
    );
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a kotlin application', async () => {
    const appName = uniq('quarkus-maven-app-');
    const port = 8282;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --language kotlin --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/kotlin/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResource.kt`,
        `apps/${appName}/src/test/kotlin/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.kt`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(
      `build ${appName} --mvnArgs="--no-transfer-progress"`
    );
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/target`)).not.toThrow();

    //build-image preparation
    await runNxCommandAsync(`build ${appName} --mvnBuildCommand="package"`);
    if (!isWin && !isMacOs && isCI) {
      const buildImageResult = await runNxCommandAsync(
        `build-image ${appName}`
      );
      expect(buildImageResult.stdout).toContain('Executor ran for Build Image');
    }

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('--an app with aliases', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8383;

    await runNxCommandAsync(
      `g @jnxplus/nx-quarkus-maven:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --v 1.2.3 --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/pom.xml`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/org/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appDir}/${randomName}/src/test/java/org/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`apps/${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;
    const port = 8484;

    await runNxCommandAsync(
      `g @jnxplus/nx-quarkus-maven:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --simplePackageName --v 1.2.3 --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/pom.xml`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/org/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appDir}/${randomName}/src/test/java/org/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const buildmaven = readFile(`apps/${appDir}/${randomName}/pom.xml`);
    expect(buildmaven.includes('org.jnxplus')).toBeTruthy();
    expect(buildmaven.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('directory with dash', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appName = `deep-sub-dir-${randomName}`;
    const port = 8585;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --directory deep/sub-dir --port ${port}`
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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library', async () => {
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName}`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
        `libs/${libName}/src/main/java/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libName}/src/test/java/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/target`)).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });
  }, 120000);

  it('should create a kotlin library', async () => {
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
        `libs/${libName}/src/main/kotlin/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `libs/${libName}/src/test/kotlin/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libName}/pom.xml`);
    expect(pomXml.includes('org.acme')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/target`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/target`)).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

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
      target: parentProjectName,
    });
  }, 120000);

  it('should use the the specified properties to create a library', async () => {
    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/pom.xml`,
        `libs/${libDir}/${randomName}/src/main/java/org/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libDir}/${randomName}/src/test/java/org/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`libs/${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });
  }, 120000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --simplePackageName --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/pom.xml`,
        `libs/${libDir}/${randomName}/src/main/java/org/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libDir}/${randomName}/src/test/java/org/jnxplus/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });
  }, 120000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-quarkus-maven:lib ${randomName} --dir ${libDir} --t e2etag,e2ePackage --groupId org.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/pom.xml`,
        `libs/${libDir}/${randomName}/src/main/java/org/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libDir}/${randomName}/src/test/java/org/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`libs/${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${randomName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });
  }, 120000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('quarkus-maven-app-');
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName}`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --projects ${appName}`
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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
        `$&\nimport javax.inject.Inject;\nimport org.acme.${names(
          libName
        ).className.toLocaleLowerCase()}.GreetingService;`
      )
      .replace(regex2, '$&\n@Inject\nGreetingService service;')
      .replace(regex3, 'service.greeting()');

    updateFile(greetingResourcePath, newGreetingResourceContent);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('GreetingResource.java');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

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

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('quarkus-maven-app-');
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --language kotlin`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --language kotlin --projects ${appName}`
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(`ktformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

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

  it("should dep-graph don't crash when pom.xml don't contains dependencies tag", async () => {
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName}`
    );

    const regex = /<dependencies>[\s\S]*?<\/dependencies>/;
    const pomXml = `libs/${libName}/pom.xml`;
    const pomXmlContent = readFile(pomXml);
    const updatedPomXmlContent = pomXmlContent.replace(regex, '');
    updateFile(pomXml, updatedPomXmlContent);

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
      target: parentProjectName,
    });
  }, 120000);

  it('should generate java apps that use a parent project', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${appsParentProject}`
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --parent-project ${appsParentProject} --directory ${appDir}`
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject}`
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${secondAppName} --parent-project ${secondParentProject}`
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject}  --directory ${parentProjectDir}`
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${thirdAppName} --parent-project ${thirdParentProject}`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
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
      }
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
  }, 120000);

  it('should generate kotlin apps that use a parent project', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${appsParentProject}`
    );

    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --parent-project ${appsParentProject} --directory ${appDir} --language kotlin`
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentProject} --parent-project ${appsParentProject}`
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${secondAppName} --parent-project ${secondParentProject} --language kotlin`
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --parent-project ${secondParentProject}  --directory ${parentProjectDir}`
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${thirdAppName} --parent-project ${thirdParentProject} --language kotlin`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
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
      }
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
  }, 120000);

  it('should generate java libs that use a parent project', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${libsParentProject} --projectType library`
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --parent-project ${libsParentProject}`
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentProject} --projectType library  --parent-project ${libsParentProject}`
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --parent-project ${secondParentProject} --dir ${libDir}`
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentProject}  --directory ${parentProjectDir}`
    );

    const thirdLibName = uniq('quarkus-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${thirdLibName} --parent-project ${thirdParentProject}`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
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
      }
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
  }, 120000);

  it('should generate kotlin libs that use a parent project', async () => {
    const libsParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${libsParentProject} --projectType library`
    );

    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --parent-project ${libsParentProject} --language kotlin`
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentProject} --projectType library  --parent-project ${libsParentProject}`
    );

    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --parent-project ${secondParentProject} --dir ${libDir} --language kotlin`
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdParentProject = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentProject}  --directory ${parentProjectDir}`
    );

    const thirdLibName = uniq('quarkus-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${thirdLibName} --parent-project ${thirdParentProject} --language kotlin`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
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
      }
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
  }, 120000);

  it('should create an application with simple name', async () => {
    const appName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const port = 8686;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --simpleName --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml --port ${port}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${appName}/pom.xml`,
        `apps/${appDir}/${appName}/src/main/resources/application.yml`,
        `apps/${appDir}/${appName}/src/main/java/org/jnxplus/deep/subdir/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appDir}/${appName}/src/test/java/org/jnxplus/deep/subdir/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appDir}/${appName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/${appDir}/${appName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(
      `build ${appName} --mvnArgs='--no-transfer-progress'`
    );
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:${port}`)
    );

    //const dataResult = await getData(port, '/hello');
    //expect(dataResult).toMatch('Hello World!');

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(port);
    } catch (err) {
      // ignore err
    }
  }, 120000);

  it('should create a library with a simple name', async () => {
    const libName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --simpleName --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${libName}/pom.xml`,
        `libs/${libDir}/${libName}/src/main/java/org/jnxplus/deep/subdir/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libDir}/${libName}/src/test/java/org/jnxplus/deep/subdir/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good information
    const pomXml = readFile(`libs/${libDir}/${libName}/pom.xml`);
    expect(pomXml.includes('org.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/${libDir}/${libName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain('');

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
      target: parentProjectName,
    });
  }, 120000);

  it('should skip starter code when generating a java application with skipStarterCode option', async () => {
    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/java/.gitkeep`,
        `apps/${appName}/src/test/java/.gitkeep`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `apps/${appName}/src/main/java/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResource.java`,
        `apps/${appName}/src/test/java/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.java`,
        `apps/${appName}/src/native-test/java/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceIT.java`
      )
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin application with skipStarterCode option', async () => {
    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --language kotlin --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
        `apps/${appName}/src/main/resources/application.properties`,
        `apps/${appName}/src/main/kotlin/.gitkeep`,
        `apps/${appName}/src/test/kotlin/.gitkeep`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `apps/${appName}/src/main/kotlin/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResource.kt`,
        `apps/${appName}/src/test/kotlin/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceTest.kt`,
        `apps/${appName}/src/native-test/kotlin/org/acme/${names(
          appName
        ).className.toLocaleLowerCase()}/GreetingResourceIT.kt`
      )
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a java library with skipStarterCode option', async () => {
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
        `libs/${libName}/src/main/java/.gitkeep`,
        `libs/${libName}/src/test/java/.gitkeep`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `libs/${libName}/src/main/java/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingService.java`,
        `libs/${libName}/src/test/java/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.java`
      )
    ).not.toThrow();
  }, 120000);

  it('should skip starter code when generating a kotlin library with skipStarterCode option', async () => {
    const libName = uniq('quarkus-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --language kotlin --skipStarterCode`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
        `libs/${libName}/src/main/kotlin/.gitkeep`,
        `libs/${libName}/src/test/kotlin/.gitkeep`
      )
    ).not.toThrow();

    expect(() =>
      checkFilesDoNotExist(
        `libs/${libName}/src/main/kotlin/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingService.kt`,
        `libs/${libName}/src/test/kotlin/org/acme/${names(
          libName
        ).className.toLocaleLowerCase()}/GreetingServiceTest.kt`
      )
    ).not.toThrow();
  }, 120000);

  it('should generate java nested sub-projects', async () => {
    const appsParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${appsParentProject}`
    );

    const appName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject}`
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentProject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentProject} --simpleName --parent-project ${appsParentProject} --directory ${appsParentProject}`
    );

    const secondAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${secondAppName} --simpleName --parent-project ${secondParentProject} --directory ${appsParentProject}/${secondParentProject}`
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const thirdParentProject = uniq('apps-parent-project-');
    const parentProjectDir = `${appsParentProject}/${secondParentProject}/deep/subdir`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${thirdParentProject} --simpleName --parent-project ${secondParentProject}  --directory ${parentProjectDir}`
    );

    const thirdAppName = uniq('quarkus-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${thirdAppName} --parent-project ${thirdParentProject}`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');

    //graph
    const localTmpDir = path.dirname(tmpProjPath());
    const projectJson1 = path.join(
      localTmpDir,
      'proj',
      'apps',
      appsParentProject,
      'project.json'
    );
    fse.removeSync(projectJson1);
    const depGraphResult = await runNxCommandAsync(
      `dep-graph --file=dep-graph.json`
    );
    expect(depGraphResult.stderr).not.toContain(
      'Failed to process the project graph'
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
      }
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
  }, 120000);
});
