import { names } from '@nrwl/devkit';
import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  readFile,
  runNxCommandAsync,
  uniq,
  updateFile,
} from '@nrwl/nx-plugin/testing';

describe('nx-boot-gradle e2e', () => {
  it('should init the workspace with @jnxplus/nx-boot-gradle capabilities', async () => {
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');
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
        'settings.gradle'
      )
    ).not.toThrow();
  }, 120000);

  it('should create an application', async () => {
    const appName = uniq('boot-gradle-app-');
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');

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
  }, 120000);

  it('should create an application with the specified properties', async () => {
    const appName = uniq('boot-gradle-app-');
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

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
  }, 120000);

  it('should create a library', async () => {
    const libName = uniq('boot-gradle-lib-');
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');

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
  }, 120000);

  it('should create a library with the specified properties', async () => {
    const libName = uniq('boot-gradle-lib-');
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');

    await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

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
  }, 120000);

  it('should add a lib to an app dependencies', async () => {
    const appName = uniq('boot-gradle-app-');
    const libName = uniq('boot-gradle-lib-');
    ensureNxProject('@jnxplus/nx-boot-gradle', 'dist/packages/nx-boot-gradle');
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
  }, 120000);
});
