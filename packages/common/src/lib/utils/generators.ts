import { PluginConfiguration, joinPathFragments, names } from '@nx/devkit';
import { normalizeName } from '.';

export function generateSimpleProjectName(options: { name: string }) {
  return names(normalizeName(options.name)).fileName;
}

export function generateProjectName(
  simpleProjectName: string,
  options: {
    name: string;
    simpleName: boolean | undefined;
    directory: string | undefined;
  },
) {
  let projectName: string;
  if (options.simpleName) {
    projectName = simpleProjectName;
  } else {
    projectName = options.directory
      ? `${normalizeName(
          names(options.directory).fileName,
        )}-${simpleProjectName}`
      : simpleProjectName;
  }

  return projectName;
}

export function generateProjectDirectory(
  simpleProjectName: string,
  options: { directory: string | undefined },
) {
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}`
    : simpleProjectName;

  return projectDirectory;
}

export function generateProjectRoot(
  rootDirectory: string,
  projectDirectory: string,
) {
  return joinPathFragments(rootDirectory, projectDirectory);
}

export function parseTags(tags: string | undefined) {
  return tags ? tags.split(',').map((s) => s.trim()) : [];
}

export function generateAppClassName(
  projectName: string,
  options: { framework: string | undefined },
) {
  let appClassName = '';
  if (options.framework === 'micronaut') {
    appClassName = names(projectName).className;
  } else {
    appClassName = `${names(projectName).className}Application`;
  }

  return appClassName;
}

export function generatePackageName(
  simpleProjectName: string,
  options: {
    simplePackageName: boolean | undefined;
    groupId: string;
    directory: string | undefined;
  },
) {
  let packageName: string;
  if (options.simplePackageName) {
    packageName = `${options.groupId}.${names(
      simpleProjectName,
    ).className.toLocaleLowerCase()}`.replace(new RegExp(/-/, 'g'), '');
  } else {
    packageName = `${options.groupId}.${
      options.directory
        ? `${names(options.directory).fileName.replace(
            new RegExp(/\//, 'g'),
            '.',
          )}.${names(simpleProjectName).className.toLocaleLowerCase()}`
        : names(simpleProjectName).className.toLocaleLowerCase()
    }`.replace(new RegExp(/-/, 'g'), '');
  }

  return packageName;
}

export function generatePackageDirectory(packageName: string) {
  return packageName.replace(new RegExp(/\./, 'g'), '/');
}

export function isCustomPortFunction(options: {
  port: string | number | undefined;
}) {
  return !!options.port && +options.port !== 8080;
}

export function parseProjects(projects: string | undefined) {
  return projects ? projects.split(',').map((s) => s.trim()) : [];
}

export function generateBasePackage(groupId: string) {
  return groupId.replace(new RegExp(/-/, 'g'), '');
}

// https://prettier.io/docs/en/configuration.html
export const prettierrcNameOptions = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.json5',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  '.prettierrc.toml',
];

export function getBuildTargetName(
  plugin: PluginConfiguration | undefined,
): string {
  if (typeof plugin === 'string') {
    return 'build';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'buildTargetName' in options &&
    typeof options.buildTargetName === 'string'
  ) {
    return options.buildTargetName;
  }

  return 'build';
}

export function getBuildImageTargetName(
  plugin: PluginConfiguration | undefined,
): string {
  if (typeof plugin === 'string') {
    return 'build-image';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'buildImageTargetName' in options &&
    typeof options.buildImageTargetName === 'string'
  ) {
    return options.buildImageTargetName;
  }

  return 'build-image';
}

export function getServeTargetName(
  plugin: PluginConfiguration | undefined,
): string {
  if (typeof plugin === 'string') {
    return 'serve';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'serveTargetName' in options &&
    typeof options.serveTargetName === 'string'
  ) {
    return options.serveTargetName;
  }

  return 'serve';
}

export function getTestTargetName(
  plugin: PluginConfiguration | undefined,
): string {
  if (typeof plugin === 'string') {
    return 'test';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'testTargetName' in options &&
    typeof options.testTargetName === 'string'
  ) {
    return options.testTargetName;
  }

  return 'test';
}

export function getIntegrationTestTargetName(
  plugin: PluginConfiguration | undefined,
): string {
  if (typeof plugin === 'string') {
    return 'integration-test';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'integrationTestTargetName' in options &&
    typeof options.integrationTestTargetName === 'string'
  ) {
    return options.integrationTestTargetName;
  }

  return 'integration-test';
}
