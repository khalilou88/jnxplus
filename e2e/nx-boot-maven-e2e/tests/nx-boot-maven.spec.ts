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
import { execSync } from 'child_process';
import * as path from 'path';
import * as fse from 'fs-extra';

function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = path.dirname(tmpProjPath());
  return execSync(
    `node ${require.resolve(
      '@nrwl/tao'
    )} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nrwl/workspace --npmScope=proj --preset=empty ${
      args || ''
    }`,
    {
      cwd: localTmpDir,
      ...(silent && false ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    }
  );
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

export function getExecutable() {
  const isWin = process.platform === 'win32';
  return isWin ? 'mvnw.cmd' : './mvnw';
}

describe('nx-boot-maven e2e', () => {
  const isWin = process.platform === 'win32';
  beforeAll(async () => {
    fse.ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand('', true);

    patchPackageJsonForPlugin(
      '@jnxplus/nx-boot-maven',
      'dist/packages/nx-boot-maven'
    );
    patchPackageJsonForPlugin(
      'prettier-plugin-java',
      'node_modules/prettier-plugin-java'
    );
    patchPackageJsonForPlugin(
      '@jnxplus/checkstyle',
      'node_modules/@jnxplus/checkstyle'
    );
    patchPackageJsonForPlugin(
      '@prettier/plugin-xml',
      'node_modules/@prettier/plugin-xml'
    );
    patchPackageJsonForPlugin('@jnxplus/pmd', 'node_modules/@jnxplus/pmd');
    patchPackageJsonForPlugin(
      '@jnxplus/ktlint',
      'node_modules/@jnxplus/ktlint'
    );
    runPackageManagerInstall();

    const parentProjectName = uniq('parent-project-name-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:init --parentProjectName ${parentProjectName}`
    );
  }, 1200000);

  it('should init the workspace with @jnxplus/nx-boot-maven capabilities', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-boot-maven dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-boot-maven']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-boot-maven inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-boot-maven')).toBeTruthy();

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
    await runNxCommandAsync(`generate @jnxplus/nx-boot-maven:init`);
    await runNxCommandAsync(`generate @jnxplus/nx-boot-maven:migrate`);
  }, 1200000);

  it('should create an java application', async () => {
    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const buildmaven = readFile(`apps/${appName}/pom.xml`);
    expect(buildmaven.includes('com.example')).toBeTruthy();
    expect(buildmaven.includes('0.0.1-SNAPSHOT')).toBeTruthy();

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

    if (!isWin) {
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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('should use specified options to create an application', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appDir = 'deep/subdir';
    const appName = `${normalizeName(appDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${randomName} --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/pom.xml`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/${appDir}/${randomName}/src/test/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/test/java/com/jnxplus/deep/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();
    expect(pomXml.includes('war')).toBeTruthy();
    expect(pomXml.includes('spring-boot-starter-tomcat')).toBeTruthy();

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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('should create an kotlin application', async () => {
    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName} --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/pom.xml`,
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
        ).className.toLocaleLowerCase()}/HelloControllerTests.kt`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
    expect(pomXml.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate target folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'target');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/target`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/target`)).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(`kformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 1200000);

  it('--an app with aliases', async () => {
    const randomName = uniq('boot-gradle-app-');
    const appDir = 'subdir';
    const appName = `${appDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-maven:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/pom.xml`,
        `apps/${appDir}/${randomName}/src/main/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/${appDir}/${randomName}/src/main/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/${appDir}/${randomName}/src/test/resources/application.yml`,
        `apps/${appDir}/${randomName}/src/test/java/com/jnxplus/subdir/${names(
          randomName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the pom.xml file contains the good informations
    const buildmaven = readFile(`apps/${appDir}/${randomName}/pom.xml`);
    expect(buildmaven.includes('com.jnxplus')).toBeTruthy();
    expect(buildmaven.includes('1.2.3')).toBeTruthy();
    expect(buildmaven.includes('war')).toBeTruthy();
    expect(buildmaven.includes('spring-boot-starter-tomcat')).toBeTruthy();

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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('should create a library', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName}`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('should create a kotlin library', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName} --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libName}/pom.xml`);
    expect(pomXml.includes('com.example')).toBeTruthy();
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

    const formatResult = await runNxCommandAsync(`kformat ${libName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 1200000);

  it('should use the the specified properties to create a library', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${randomName} --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('--a lib with aliases', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'subdir';
    const libName = `${libDir}-${randomName}`;

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-maven:lib ${randomName} --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/${libDir}/${randomName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
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
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );
  }, 1200000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName}`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName} --projects ${appName}`
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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

    //TODO this because graph don't work well
    await runNxCommandAsync(`build ${libName}`);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base='
    );

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 1200000);

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName} --language kotlin --packaging war`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName} --language kotlin --projects ${appName}`
    );

    // Making sure the app pom.xml file contains the lib
    const pomXml = readFile(`apps/${appName}/pom.xml`);
    expect(pomXml.includes(`${libName}`)).toBeTruthy();

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

    //TODO this because graph don't work well
    await runNxCommandAsync(`build ${libName}`);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(`kformat ${appName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 1200000);
});
