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

describe('nx-boot-maven e2e', () => {
  beforeEach(async () => {
    ensureNxProject('@jnxplus/nx-boot-maven', 'dist/packages/nx-boot-maven');
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

    await runNxCommandAsync(`generate @jnxplus/nx-boot-maven:init`);
  }, 120000);

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
        '.mvn/wrapper/MavenWrapperDownloader.java',
        'mvnw',
        'mvnw.cmd',
        'pom.xml',
        'tools/linters/checkstyle.xml',
        'tools/linters/pmd.xml'
      )
    ).not.toThrow();
  }, 120000);

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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${appName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

  it('should use specified options to create an application', async () => {
    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName}  --tags e2etag,e2ePackage --directory subdir --groupId com.jnxplus --projectVersion 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/subdir/${appName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`apps/subdir/${appName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();
    expect(pomXml.includes('war')).toBeTruthy();
    expect(pomXml.includes('spring-boot-starter-tomcat')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/subdir/${appName}/project.json`);
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
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

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

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    //format app
    // const command = `java -jar ./node_modules/@jnxplus/ktlint/ktlint -F "apps/${appName}/src/**/*.kt"`
    // execSync(command, { cwd: process.cwd(), stdio: [0, 1, 2] });

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    // const formatResult = await runNxCommandAsync(
    //   `format:check --projects ${appName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=main --head=HEAD'
    // );
  }, 120000);

  it('--an app with aliases', async () => {
    const appName = uniq('boot-maven-app-');

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-maven:app ${appName}  --t e2etag,e2ePackage --dir subdir --groupId com.jnxplus --v 1.2.3 --packaging war --configFormat .yml`
    );

    expect(() =>
      checkFilesExist(
        `apps/subdir/${appName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const buildmaven = readFile(`apps/subdir/${appName}/pom.xml`);
    expect(buildmaven.includes('com.jnxplus')).toBeTruthy();
    expect(buildmaven.includes('1.2.3')).toBeTruthy();
    expect(buildmaven.includes('war')).toBeTruthy();
    expect(buildmaven.includes('spring-boot-starter-tomcat')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`apps/subdir/${appName}/project.json`);
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
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

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

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const lintResult = await runNxCommandAsync(`lint ${libName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

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

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    // const formatResult = await runNxCommandAsync(
    //   `format:check --projects ${libName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=main --head=HEAD'
    // );
  }, 120000);

  it('should use the the specified properties to create a library', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName} --directory subdir --tags e2etag,e2ePackage --groupId com.jnxplus --projectVersion 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/subdir/${libName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/subdir/${libName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/subdir/${libName}/project.json`);
    expect(projectJson.tags).toEqual(['e2etag', 'e2ePackage']);

    const buildResult = await runNxCommandAsync(`build ${libName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${libName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    // const lintResult = await runNxCommandAsync(`lint ${libName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    const formatResult = await runNxCommandAsync(
      `format:check --projects ${libName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

  it('--a lib with aliases', async () => {
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `g @jnxplus/nx-boot-maven:lib ${libName} --dir subdir --t e2etag,e2ePackage --groupId com.jnxplus --v 1.2.3`
    );

    expect(() =>
      checkFilesExist(
        `libs/subdir/${libName}/pom.xml`,
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

    // Making sure the pom.xml file contains the good informations
    const pomXml = readFile(`libs/subdir/${libName}/pom.xml`);
    expect(pomXml.includes('com.jnxplus')).toBeTruthy();
    expect(pomXml.includes('1.2.3')).toBeTruthy();

    //should add tags to project.json
    const projectJson = readJson(`libs/subdir/${libName}/project.json`);
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
      'Affected criteria defaulted to --base=main --head=HEAD'
    );
  }, 120000);

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

    await runNxCommandAsync(`build ${libName}`);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    const formatResult = await runNxCommandAsync(
      `format:write --projects ${appName}`
    );
    expect(formatResult.stdout).toContain(
      'Affected criteria defaulted to --base=main --head=HEAD'
    );

    const lintResult = await runNxCommandAsync(`lint ${appName}`);
    expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 120000);

  it('should add a kotlin lib to a kotlin app dependencies', async () => {
    const appName = uniq('boot-maven-app-');
    const libName = uniq('boot-maven-lib-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:application ${appName} --language kotlin --packaging war`
    );

    await runNxCommandAsync(
      `generate @jnxplus/nx-boot-maven:library ${libName}  --language kotlin --projects ${appName}`
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

    await runNxCommandAsync(`build ${libName}`);

    const buildResult = await runNxCommandAsync(`build ${appName}`);
    expect(buildResult.stdout).toContain('Executor ran for Build');

    const testResult = await runNxCommandAsync(`test ${appName}`);
    expect(testResult.stdout).toContain('Executor ran for Test');

    // const formatResult = await runNxCommandAsync(
    //   `format:write --projects ${appName}`
    // );
    // expect(formatResult.stdout).toContain(
    //   'Affected criteria defaulted to --base=main --head=HEAD'
    // );

    // const lintResult = await runNxCommandAsync(`lint ${appName}`);
    // expect(lintResult.stdout).toContain('Executor ran for Lint');

    await runNxCommandAsync(`dep-graph --file=output.json`);
  }, 120000);
});
