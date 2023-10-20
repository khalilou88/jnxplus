import { getProjectRoot } from '@jnxplus/common';
import {
  ExecutorContext,
  NxJsonConfiguration,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import * as path from 'path';
import * as fs from 'fs';

export function getProjectPath(
  context: ExecutorContext,
  gradleRootDirectory: string,
) {
  const projectRoot = getProjectRoot(context);
  return `:${getProjectPathFromProjectRoot(projectRoot, gradleRootDirectory)}`;
}

export function getProjectPathFromProjectRoot(
  projectRoot: string,
  gradleRootDirectory: string,
) {
  return projectRoot
    .replace(new RegExp('^\\.', 'g'), '')
    .replace(new RegExp(`^${gradleRootDirectory}/`, 'g'), '')
    .replace(new RegExp('/', 'g'), ':');
}

export function getProjectRootFromProjectPath(projectPath: string) {
  if (projectPath.startsWith(':')) {
    throw new Error(`Path ${projectPath} should not starts with two dots (:)`);
  }

  return projectPath.replace(/:/g, '/');
}

export function getQuarkusVersion(gradlePropertiesContent: string) {
  const regexp = /quarkusVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}

export function getRootProjectName(settingsGradleContent: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const matches = (settingsGradleContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}

export function getGradleRootDirectory(): string {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const plugin = (nxJson?.plugins || []).find((p) =>
    typeof p === 'string'
      ? p === '@jnxplus/nx-gradle'
      : p.plugin === '@jnxplus/nx-gradle',
  );

  if (typeof plugin === 'string') {
    return '';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'gradleRootDirectory' in options &&
    typeof options.gradleRootDirectory === 'string'
  ) {
    return options.gradleRootDirectory;
  }

  return '';
}

export function getExecutable() {
  let executable = '';

  if (process.env['NX_SKIP_GRADLE_WRAPPER'] === 'true') {
    executable = 'gradle';
  } else {
    const isWrapperExists = isWrapperExistsFunction();

    if (isWrapperExists) {
      const isWin = process.platform === 'win32';
      executable = isWin ? 'gradlew.bat' : './gradlew';
    } else {
      executable = 'gradle';
    }
  }

  if (process.env['NX_GRADLE_CLI_OPTS']) {
    executable += ` ${process.env['NX_GRADLE_CLI_OPTS']}`;
  }

  return executable;
}

function isWrapperExistsFunction() {
  const gradleRootDirectory = getGradleRootDirectory();
  const gradlePath = path.join(workspaceRoot, gradleRootDirectory, 'gradlew');
  return fs.existsSync(gradlePath);
}
