import { names } from '@nrwl/devkit';
import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  readFile,
  runNxCommandAsync,
  uniq,
  updateFile,
  patchPackageJsonForPlugin,
  runPackageManagerInstall,
} from '@nrwl/nx-plugin/testing';

describe('nx-boot-gradle e2e', () => {
  beforeEach(async () => {
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');
    patchPackageJsonForPlugin(
      'prettier-plugin-java',
      'node_modules/prettier-plugin-java'
    );
    patchPackageJsonForPlugin(
      'prettier-plugin-kotlin',
      'node_modules/prettier-plugin-kotlin'
    );
    patchPackageJsonForPlugin(
      '@jnxplus/checkstyle',
      'node_modules/@jnxplus/checkstyle'
    );
    runPackageManagerInstall();
  }, 120000);

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
        'checkstyle.xml'
      )
    ).not.toThrow();
  }, 120000);

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
        'checkstyle.xml'
      )
    ).not.toThrow();
  }, 120000);

  it('should create an java application', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('should use specified options to create an application', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:application ${appName}  --tags e2etag,e2ePackage --directory subdir --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/subdir/${appName}/build.gradle`,
        `apps/subdir/${appName}/src/main/resources/application.yml`,
        `apps/subdir/${appName}/src/main/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/subdir/${appName}/src/main/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/subdir/${appName}/src/test/resources/application.yml`,
        `apps/subdir/${appName}/src/test/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/subdir/${appName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to nx.json
    const nxJson = readJson('nx.json');
    expect(nxJson.projects[appName].tags).toEqual(['e2etag', 'e2ePackage']);

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
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('should create an kotlin application', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    // const formatResult = await runNxCommandAsync(
    //   `format:check --projects ${appName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=master --head=HEAD'
    // );
  }, 120000);

  it('--an app with aliases', async () => {
    const appName = uniq('boot-gradle-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-gradle:app ${appName}  --t e2etag,e2ePackage --dir subdir --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/subdir/${appName}/build.gradle`,
        `apps/subdir/${appName}/src/main/resources/application.yml`,
        `apps/subdir/${appName}/src/main/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/${
          names(appName).className
        }Application.java`,
        `apps/subdir/${appName}/src/main/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloController.java`,

        `apps/subdir/${appName}/src/test/resources/application.yml`,
        `apps/subdir/${appName}/src/test/java/com/jnxplus/${names(
          appName
        ).className.toLocaleLowerCase()}/HelloControllerTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`apps/subdir/${appName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();
    expect(buildGradle.includes('war')).toBeTruthy();
    expect(
      buildGradle.includes(
        'org.springframework.boot:spring-boot-starter-tomcat'
      )
    ).toBeTruthy();

    //should add tags to nx.json
    const nxJson = readJson('nx.json');
    expect(nxJson.projects[appName].tags).toEqual(['e2etag', 'e2ePackage']);

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
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('should create a library', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

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

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('should create a kotlin library', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

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

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    // const formatResult = await runNxCommandAsync(
    //   `format:check --projects ${libName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=master --head=HEAD'
    // );
  }, 120000);

  it('should create a library with the specified properties', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:library ${libName} --directory subdir --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/subdir/${libName}/build.gradle`,
        `libs/subdir/${libName}/src/main/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/subdir/${libName}/src/test/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/subdir/${libName}/src/test/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/subdir/${libName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to nx.json
    const nxJson = readJson('nx.json');
    expect(nxJson.projects[libName].tags).toEqual(['e2etag', 'e2ePackage']);

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
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('--a lib with aliases', async () => {
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`g @jnxplus/nx-boot-gradle:init`);

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-gradle:lib ${libName} --dir subdir --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/subdir/${libName}/build.gradle`,
        `libs/subdir/${libName}/src/main/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloService.java`,
        `libs/subdir/${libName}/src/test/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/TestConfiguration.java`,
        `libs/subdir/${libName}/src/test/java/com/jnxplus/${names(
          libName
        ).className.toLocaleLowerCase()}/HelloServiceTests.java`
      )
    ).not.toThrow();

    // Making sure the build.gradle file contains the good informations
    const buildGradle = readFile(`libs/subdir/${libName}/build.gradle`);
    expect(buildGradle.includes('com.jnxplus')).toBeTruthy();
    expect(buildGradle.includes('1.2.3')).toBeTruthy();

    //should add tags to nx.json
    const nxJson = readJson('nx.json');
    expect(nxJson.projects[libName].tags).toEqual(['e2etag', 'e2ePackage']);

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
      'Affected criteria defaulted to --base=master --head=HEAD'
    );
  }, 120000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

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
      'Affected criteria defaulted to --base=master --head=HEAD'
    );

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 120000);

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-gradle:init --dsl kotlin`
    );

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

    // const formatResult = await runNxCommandAsync(
    //   `format:write --projects ${appName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=master --head=HEAD'
    // );

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 120000);
});
