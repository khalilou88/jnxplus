import { names } from '@nrwl/devkit';
import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
describe('nx-boot-gradle e2e', () => {
  describe('init e2e', () => {
    it('should init', async () => {
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );
      await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

      // Making sure the package.json file contains the @jnxplus/nx-boot-gradle dependency
      const packageJson = readJson('package.json');
      expect(
        packageJson.devDependencies['@jnxplus/nx-boot-gradle']
      ).toBeTruthy();

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
  });

  describe('application e2e', () => {
    it('should create an application', async () => {
      const appName = uniq('boot-gradle-app-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );

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

      const buildResult = await runNxCommandAsync(`build ${appName}`);
      expect(buildResult.stdout).toContain('Executor ran for Build');

      const testResult = await runNxCommandAsync(`test ${appName}`);
      expect(testResult.stdout).toContain('Executor ran for Test');
    }, 120000);

    it('should create an application with the specified properties', async () => {
      const appName = uniq('boot-gradle-app-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );

      await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:application ${appName} --configFormat .yml`
      );

      expect(() =>
        checkFilesExist(
          `apps/${appName}/build.gradle`,
          `apps/${appName}/src/main/resources/application.yml`,
          `apps/${appName}/src/main/java/com/example/${names(
            appName
          ).className.toLocaleLowerCase()}/${
            names(appName).className
          }Application.java`,
          `apps/${appName}/src/main/java/com/example/${names(
            appName
          ).className.toLocaleLowerCase()}/HelloController.java`,

          `apps/${appName}/src/test/resources/application.yml`,
          `apps/${appName}/src/test/java/com/example/${names(
            appName
          ).className.toLocaleLowerCase()}/HelloControllerTests.java`
        )
      ).not.toThrow();

      const buildResult = await runNxCommandAsync(`build ${appName}`);
      expect(buildResult.stdout).toContain('Executor ran for Build');

      const testResult = await runNxCommandAsync(`test ${appName}`);
      expect(testResult.stdout).toContain('Executor ran for Test');
    }, 120000);

    it('should create an application with war packaging', async () => {
      const appName = uniq('boot-gradle-app-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );

      await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:application ${appName} --packaging war`
      );

      const result = await runNxCommandAsync(`build ${appName}`);
      expect(result.stdout).toContain('Executor ran');
    }, 120000);

    describe('--directory', () => {
      it('should create build.gradle in the specified directory', async () => {
        const appName = uniq('boot-gradle-app-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:application ${appName} --directory subdir`
        );
        expect(() =>
          checkFilesExist(`apps/subdir/${appName}/build.gradle`)
        ).not.toThrow();

        const result = await runNxCommandAsync(`build ${appName}`);
        expect(result.stdout).toContain('Executor ran');
      }, 120000);
    });

    describe('--tags', () => {
      it('should add tags to nx.json', async () => {
        const appName = uniq('boot-gradle-app-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:application ${appName} --tags e2etag,e2ePackage`
        );
        const nxJson = readJson('nx.json');
        expect(nxJson.projects[appName].tags).toEqual(['e2etag', 'e2ePackage']);
      }, 120000);
    });
  });

  describe('library e2e', () => {
    it('should create a library', async () => {
      const libName = uniq('boot-gradle-lib-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );

      await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:library ${libName}`
      );

      const result = await runNxCommandAsync(`build ${libName}`);
      expect(result.stdout).toContain('Executor ran');
    }, 120000);

    describe('--directory', () => {
      it('should create build.gradle in the specified directory', async () => {
        const libName = uniq('boot-gradle-lib-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:library ${libName} --directory subdir`
        );
        expect(() =>
          checkFilesExist(`libs/subdir/${libName}/build.gradle`)
        ).not.toThrow();

        const result = await runNxCommandAsync(`build ${libName}`);
        expect(result.stdout).toContain('Executor ran');
      }, 120000);
    });

    describe('--tags', () => {
      it('should add tags to nx.json', async () => {
        const libName = uniq('boot-gradle-lib-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:library ${libName} --tags e2etag,e2ePackage`
        );
        const nxJson = readJson('nx.json');
        expect(nxJson.projects[libName].tags).toEqual(['e2etag', 'e2ePackage']);
      }, 120000);
    });
  });

  describe('App & lib e2e', () => {
    it('should create app and lib and add lib to app deps', async () => {
      const appName = uniq('boot-gradle-app-');
      const libName = uniq('boot-gradle-lib-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );
      await runNxCommandAsync(`generate @jnxplus/nx-boot-gradle:init`);

      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:application ${appName}`
      );

      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:library ${libName}`
      );
    }, 120000);
  });
});
