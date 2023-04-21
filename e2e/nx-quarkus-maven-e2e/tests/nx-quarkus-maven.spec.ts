import { names } from '@nrwl/devkit';
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
} from '@nrwl/nx-plugin/testing';
import * as fse from 'fs-extra';
import * as path from 'path';
import {
  killPorts,
  normalizeName,
  promisifiedTreeKill,
  runNxCommandUntil,
  runNxNewCommand,
} from './e2e-utils';
import * as fs from 'fs';

describe('nx-quarkus-maven e2e', () => {
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
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

    const parentProjectName = uniq('parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:init --parentProjectName ${parentProjectName}`
    );

    if (isCI) {
      const filePath = `${process.cwd()}/.gitignore`;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const updatedFileContent = fileContent.replace('/tmp', '');
      fs.writeFileSync(filePath, updatedFileContent);
    }
  }, 1200000);

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
  }, 1200000);

  it('should migrate', async () => {
    await runNxCommandAsync(`generate @jnxplus/nx-quarkus-maven:migrate`);
  }, 1200000);

  it('should create an java application', async () => {
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
    if (!isWin && !isMacOs) {
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

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }

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
  }, 1200000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --tags e2etag,e2ePackage --directory ${appDir} --groupId org.jnxplus --projectVersion 1.2.3 --configFormat .yml`
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

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 1200000);

  it('should create an kotlin application', async () => {
    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --language kotlin`
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
    if (!isWin && !isMacOs) {
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

    const process = await runNxCommandUntil(`serve ${appName}`, (output) =>
      output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 1200000);

  it('--an app with aliases', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-quarkus-maven:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --v 1.2.3 --configFormat .yml`
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

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 1200000);

  it('should generate an app with a simple package name', async () => {
    const randomName = uniq('quarkus-maven-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-quarkus-maven:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId org.jnxplus --packageNameType short --v 1.2.3 --configFormat .yml`
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

    const process = await runNxCommandUntil(
      `serve ${appName} --args="-Dquarkus-profile=prod"`,
      (output) => output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 1200000);

  it('directory with dash', async () => {
    const appName = uniq('quarkus-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${appName} --directory deep/sub-dir`
    );

    const process = await runNxCommandUntil(
      `serve deep-sub-dir-${appName}`,
      (output) => output.includes(`Listening on: http://localhost:8080`)
    );

    // port and process cleanup
    try {
      await promisifiedTreeKill(process.pid, 'SIGKILL');
      await killPorts(8080);
    } catch (err) {
      expect(err).toBeFalsy();
    }
  }, 1200000);

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
  }, 1200000);

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
  }, 1200000);

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
  }, 1200000);

  it('should generare a lib with a simple package name', async () => {
    const randomName = uniq('quarkus-maven-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --directory ${libDir} --tags e2etag,e2ePackage --groupId org.jnxplus --packageNameType short --projectVersion 1.2.3`
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
  }, 1200000);

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
  }, 1200000);

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
      target: libName,
    });
  }, 1200000);

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
      target: libName,
    });
  }, 1200000);

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
  }, 1200000);

  it('should generate java apps that use a parent project', async () => {
    const appsParentproject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${appsParentproject}`
    );

    const randomName = uniq('boot-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --parent-project ${appsParentproject} --directory ${appDir}`
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentproject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentproject} --parent-project ${appsParentproject}`
    );

    const secondAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${secondAppName} --parent-project ${secondParentproject}`
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdProjectName = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --parent-project ${secondParentproject}  --directory ${parentProjectDir}`
    );

    const thirdAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${thirdAppName} --parent-project ${thirdProjectName}`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');
  }, 1200000);

  it('should generate kotlin apps that use a parent project', async () => {
    const appsParentproject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${appsParentproject}`
    );

    const randomName = uniq('boot-maven-app-');
    const appDir = 'dir';
    const appName = `${normalizeName(appDir)}-${randomName}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${randomName} --parent-project ${appsParentproject} --directory ${appDir} --language kotlin`
    );
    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentproject = uniq('apps-parent-project-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentproject} --parent-project ${appsParentproject}`
    );

    const secondAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${secondAppName} --parent-project ${secondParentproject} --language kotlin`
    );
    const secondBuildResult = await runNxCommandAsync(`build ${secondAppName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('apps-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdProjectName = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --parent-project ${secondParentproject}  --directory ${parentProjectDir}`
    );

    const thirdAppName = uniq('boot-maven-app-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:application ${thirdAppName} --parent-project ${thirdProjectName} --language kotlin`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdAppName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');
  }, 1200000);

  it('should generate java libs that use a parent project', async () => {
    const libsParentproject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${libsParentproject} --projectType library`
    );

    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --parent-project ${libsParentproject}`
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentproject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentproject} --projectType library  --parent-project ${libsParentproject}`
    );

    const randomName = uniq('boot-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --parent-project ${secondParentproject} --dir ${libDir}`
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdProjectName = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentproject}  --directory ${parentProjectDir}`
    );

    const thirdLibName = uniq('boot-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${thirdLibName} --parent-project ${thirdProjectName}`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');
  }, 1200000);

  it('should generate kotlin libs that use a parent project', async () => {
    const libsParentproject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${libsParentproject} --projectType library`
    );

    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${libName} --parent-project ${libsParentproject} --language kotlin`
    );

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const secondParentproject = uniq('libs-parent-project-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${secondParentproject} --projectType library  --parent-project ${libsParentproject}`
    );

    const randomName = uniq('boot-maven-lib-');
    const libDir = 'subdir';
    const secondLibName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${randomName} --parent-project ${secondParentproject} --dir ${libDir} --language kotlin`
    );

    const secondBuildResult = await runNxCommandAsync(`build ${secondLibName}`);
    expect(secondBuildResult.stdout).toContain('Executor ran for Build');

    const randomParentproject = uniq('libs-parent-project-');
    const parentProjectDir = 'deep/subdir';
    const thirdProjectName = `${normalizeName(
      parentProjectDir
    )}-${randomParentproject}`;
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:parent-project ${randomParentproject} --projectType library --parent-project ${secondParentproject}  --directory ${parentProjectDir}`
    );

    const thirdLibName = uniq('boot-maven-lib-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-quarkus-maven:library ${thirdLibName} --parent-project ${thirdProjectName} --language kotlin`
    );
    const thirdBuildResult = await runNxCommandAsync(`build ${thirdLibName}`);
    expect(thirdBuildResult.stdout).toContain('Executor ran for Build');
  }, 1200000);
});
