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

function workaroundFixE2eTests() {
  let nxJson = readJson('nx.json');
  nxJson.plugins = [];
  updateFile('nx.json', JSON.stringify(nxJson));
}

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

describe('nx-boot-gradle e2e', () => {
  beforeEach(async () => {
    fse.ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand('', true);

    patchPackageJsonForPlugin(
      '@jnxplus/nx-boot-gradle',
      'dist/packages/nx-boot-gradle'
    );
    patchPackageJsonForPlugin(
      'prettier-plugin-java',
      'node_modules/prettier-plugin-java'
    );
    patchPackageJsonForPlugin(
      '@jnxplus/checkstyle',
      'node_modules/@jnxplus/checkstyle'
    );
    patchPackageJsonForPlugin('@jnxplus/pmd', 'node_modules/@jnxplus/pmd');
    patchPackageJsonForPlugin(
      '@jnxplus/ktlint',
      'node_modules/@jnxplus/ktlint'
    );
    runPackageManagerInstall();
  }, 1200000);

  it('should init the workspace with @jnxplus/nx-boot-gradle capabilities', async () => {
    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

    // Making sure the package.json file contains the @jnxplus/nx-boot-gradle dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-boot-gradle']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-boot-gradle inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-boot-gradle')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        'gradle/wrapper/gradle-wrapper.jar',
        'gradle/wrapper/gradle-wrapper.properties',
        'gradlew',
        'gradlew.bat',
        'gradle.properties',
        'settings.gradle',
        'tools/linters/checkstyle.xml'
      )
    ).not.toThrow();
  }, 1200000);

  it('should use dsl option when initing the workspace', async () => {
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );

    // Making sure the package.json file contains the @jnxplus/nx-boot-gradle dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-boot-gradle']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-boot-gradle inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-boot-gradle')).toBeTruthy();

    expect(() =>
      checkFilesExist(
        'gradle/wrapper/gradle-wrapper.jar',
        'gradle/wrapper/gradle-wrapper.properties',
        'gradlew',
        'gradlew.bat',
        'gradle.properties',
        'settings.gradle.kts',
        'tools/linters/checkstyle.xml'
      )
    ).not.toThrow();
  }, 1200000);

  it('should migrate', async () => {
    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:migrate`);
  }, 1200000);

  it('should create an java application', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${appName}`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/${appName}/build.gradle`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/build`)).not.toThrow();

    // const buildImageResult = await runNxCommandAsync(`build-image ${appName}`);
    // expect(buildImageResult.stdout).toContain('Executor ran for Build Image');

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
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${randomName} --tags e2etag,e2ePackage --directory ${appDir} --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/${appDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

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
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${appName} --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appName}/build.gradle.kts`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'apps', appName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`apps/${appName}/build`)).toThrow();
    await runNxCommandAsync(`build ${appName}`);
    expect(() => checkFilesExist(`apps/${appName}/build`)).not.toThrow();

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
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `g @jnxplus/nx-boot-gradle:app ${randomName} --t e2etag,e2ePackage --dir ${appDir} --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/${appDir}/${randomName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/${appDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

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
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${libName}`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/${libName}/build.gradle`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/build`)).not.toThrow();

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
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${libName} --language kotlin`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libName}/build.gradle.kts`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/${libName}/build.gradle.kts`);
    expect(buildGradle.includes('com.example')).toBeTruthy();
    expect(buildGradle.includes('0.0.1-SNAPSHOT')).toBeTruthy();

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    //should recreate build folder
    const localTmpDir = path.dirname(tmpProjPath());
    const targetDir = path.join(localTmpDir, 'proj', 'libs', libName, 'build');
    fse.removeSync(targetDir);
    expect(() => checkFilesExist(`libs/${libName}/build`)).toThrow();
    await runNxCommandAsync(`build ${libName}`);
    expect(() => checkFilesExist(`libs/${libName}/build`)).not.toThrow();

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(`kformat ${libName}`);
    expect(formatResult.stdout).toContain('Executor ran for Kotlin Format');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');
  }, 1200000);

  it('should create a library with the specified properties', async () => {
    const randomName = uniq('boot-gradle-lib-');
    const libDir = 'deep/subdir';
    const libName = `${normalizeName(libDir)}-${randomName}`;

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${randomName} --directory ${libDir} --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/${libDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

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

    await runNxCommandAsync(`g @jnxplus/nx-boot-gradle:init`);
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `g @jnxplus/nx-boot-gradle:lib ${randomName} --dir ${libDir} --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/${libDir}/${randomName}/build.gradle`,
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

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/${libDir}/${randomName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

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
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    const parentProjectName = uniq('parent-project-name-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --parentProjectName ${parentProjectName}`
    );
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${appName}`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${libName} --projects ${appName}`
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

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
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    const parentProjectName = uniq('parent-project-name-');
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin --parentProjectName ${parentProjectName}`
    );
    workaroundFixE2eTests();
    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${appName} --language kotlin --packaging war`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${libName}  --language kotlin --projects ${appName}`
    );

    // Making sure the app build.gradle file contains the lib
    const buildGradle = readFile(`apps/${appName}/build.gradle.kts`);
    expect(buildGradle.includes(`:libs:${libName}`)).toBeTruthy();

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
