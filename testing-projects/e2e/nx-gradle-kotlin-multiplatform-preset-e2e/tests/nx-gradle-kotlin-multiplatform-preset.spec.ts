import { names, workspaceRoot } from '@nx/devkit';
import {
  checkFilesExist,
  cleanup,
  readFile,
  readJson,
  runNxCommandAsync,
  tmpProjPath,
  uniq,
  updateFile,
} from '@nx/plugin/testing';
import * as fse from 'fs-extra';
import * as path from 'path';

import { checkstyleVersion } from '@jnxplus/common';
import {
  addTmpToGitignore,
  patchPackageJson,
  patchRootPackageJson,
  removeTmpFromGitignore,
  runNxNewCommand,
  runPackageManagerInstallLinks,
} from '@jnxplus/internal/testing';

describe('nx-gradle-kotlin-multiplatform kt e2e', () => {
  const isCI =
    process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWin = process.platform === 'win32';
  const isMacOs = process.platform === 'darwin';
  const rootProjectName = uniq('boot-root-project-');

  beforeAll(async () => {
    fse.ensureDirSync(tmpProjPath());
    cleanup();
    runNxNewCommand('', true);

    const pluginName = '@jnxplus/nx-gradle';
    const nxGradleDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'nx-gradle'
    );

    const commonDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'common'
    );

    const gradleDistAbsolutePath = path.join(
      workspaceRoot,
      'dist',
      'packages',
      'gradle'
    );

    patchRootPackageJson(pluginName, nxGradleDistAbsolutePath);
    patchRootPackageJson('@jnxplus/common', commonDistAbsolutePath);
    patchRootPackageJson('@jnxplus/gradle', gradleDistAbsolutePath);

    patchPackageJson(
      gradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );

    patchPackageJson(
      nxGradleDistAbsolutePath,
      '@jnxplus/common',
      commonDistAbsolutePath
    );
    patchPackageJson(
      nxGradleDistAbsolutePath,
      '@jnxplus/gradle',
      gradleDistAbsolutePath
    );

    runPackageManagerInstallLinks();

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:init --dsl kotlin --rootProjectName ${rootProjectName} --preset kotlin-multiplatform`
    );

    if (isCI) {
      removeTmpFromGitignore();
    }
  }, 120000);

  afterAll(async () => {
    if (isCI) {
      addTmpToGitignore();
    }

    // `nx reset` kills the daemon, and performs
    // some work which can help clean up e2e leftovers
    await runNxCommandAsync('reset');
  });

  it('should set NX_VERBOSE_LOGGING to true', async () => {
    expect(process.env['NX_VERBOSE_LOGGING']).toBe('true');
  }, 120000);

  it('should use dsl option when initiating the workspace', async () => {
    // Making sure the package.json file contains the @jnxplus/nx-gradle dependency
    const packageJson = readJson('package.json');
    expect(packageJson.devDependencies['@jnxplus/nx-gradle']).toBeTruthy();

    // Making sure the nx.json file contains the @jnxplus/nx-gradle inside the plugins section
    const nxJson = readJson('nx.json');
    expect(nxJson.plugins.includes('@jnxplus/nx-gradle')).toBeTruthy();

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

    expect(() =>
      checkFilesExist(
        `node_modules/@jnxplus/tools/linters/checkstyle/checkstyle-${checkstyleVersion}-all.jar`,
        `node_modules/@jnxplus/tools/linters/ktlint/ktlint`
      )
    ).not.toThrow();
  }, 120000);

  it('shoud works', async () => {
    const name = uniq('kotlin-multiplatform-');

    await runNxCommandAsync(
      `generate @jnxplus/nx-gradle:kotlin-multiplatform ${name}`
    );
  }, 120000);
});
