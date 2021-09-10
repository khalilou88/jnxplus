import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq,
} from '@nrwl/nx-plugin/testing';
describe('nx-boot-gradle e2e', () => {
  describe('application e2e', () => {
    it('should create an application', async () => {
      const appName = uniq('boot-gradle-app-');
      ensureNxProject(
        '@jnxplus/nx-boot-gradle',
        'dist/packages/nx-boot-gradle'
      );
      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:application ${appName}`
      );

      const result = await runNxCommandAsync(`build ${appName}`);
      expect(result.stdout).toContain('Executor ran');
    }, 120000);

    describe('--directory', () => {
      it('should create src in the specified directory', async () => {
        const appName = uniq('boot-gradle-app-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:application ${appName} --directory subdir`
        );
        expect(() =>
          checkFilesExist(`apps/subdir/${appName}/src/index.ts`)
        ).not.toThrow();
      }, 120000);
    });

    describe('--tags', () => {
      it('should add tags to nx.json', async () => {
        const appName = uniq('boot-gradle-app-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
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
      await runNxCommandAsync(
        `generate @jnxplus/nx-boot-gradle:library ${libName}`
      );

      const result = await runNxCommandAsync(`build ${libName}`);
      expect(result.stdout).toContain('Executor ran');
    }, 120000);

    describe('--directory', () => {
      it('should create src in the specified directory', async () => {
        const libName = uniq('boot-gradle-lib-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:library ${libName} --directory subdir`
        );
        expect(() =>
          checkFilesExist(`libs/subdir/${libName}/src/index.ts`)
        ).not.toThrow();
      }, 120000);
    });

    describe('--tags', () => {
      it('should add tags to nx.json', async () => {
        const libName = uniq('boot-gradle-lib-');
        ensureNxProject(
          '@jnxplus/nx-boot-gradle',
          'dist/packages/nx-boot-gradle'
        );
        await runNxCommandAsync(
          `generate @jnxplus/nx-boot-gradle:library ${libName} --tags e2etag,e2ePackage`
        );
        const nxJson = readJson('nx.json');
        expect(nxJson.projects[libName].tags).toEqual(['e2etag', 'e2ePackage']);
      }, 120000);
    });
  });
});
