import {
  DSLType,
  VersionManagementType,
  getProjectRoot,
  quarkusVersion,
} from '@jnxplus/common';
import {
  ExecutorContext,
  NxJsonConfiguration,
  PluginConfiguration,
  Tree,
  joinPathFragments,
  normalizePath,
  readJsonFile,
  readProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';

export function getProjectPath(
  context: ExecutorContext,
  gradleRootDirectoryAbsolutePath: string,
) {
  const projectRoot = getProjectRoot(context);
  return getProjectPathFromProjectRoot(
    projectRoot,
    gradleRootDirectoryAbsolutePath,
  );
}

export function getProjectPathFromProjectRoot(
  projectRoot: string,
  gradleRootDirectoryAbsolutePath: string,
) {
  const projectPathSlash = normalizePath(
    path.relative(
      gradleRootDirectoryAbsolutePath,
      path.join(workspaceRoot, projectRoot),
    ),
  );

  const projectPath = projectPathSlash.replace(/\//g, ':');

  return `:${projectPath}`;
}

export function getQuarkusVersion(gradlePropertiesContent: string) {
  const regexp = /quarkusVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) ?? []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}

export function getRootProjectName(settingsGradleContent: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const matches = (settingsGradleContent.match(regexp) ?? []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}

export function getPlugin(): PluginConfiguration | undefined {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const plugin = (nxJson?.plugins ?? []).find((p) =>
    typeof p === 'string'
      ? p === '@jnxplus/nx-gradle'
      : p.plugin === '@jnxplus/nx-gradle',
  );

  return plugin;
}

export function getGradleRootDirectory(): string {
  const plugin = getPlugin();

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

export function getExecutable() {
  let executable = '';

  if (process.env['NX_SKIP_GRADLE_WRAPPER'] === 'true') {
    executable = 'gradle';
  } else {
    const isWrapperExists = isWrapperExistsFunction();

    if (isWrapperExists) {
      executable = process.platform.startsWith('win')
        ? 'gradlew.bat'
        : './gradlew';
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

export function getDsl(tree: Tree, gradleRootDirectory: string): DSLType {
  const filePath = joinPathFragments(gradleRootDirectory, 'settings.gradle');

  if (tree.exists(filePath)) {
    return 'groovy';
  }

  return 'kotlin';
}

export function addProjectToGradleSetting(
  tree: Tree,
  options: { projectRoot: string; gradleRootDirectory: string },
) {
  const filePath = joinPathFragments(
    options.gradleRootDirectory,
    'settings.gradle',
  );
  const ktsFilePath = joinPathFragments(
    options.gradleRootDirectory,
    'settings.gradle.kts',
  );

  const regex = /.*rootProject\.name.*/;
  const projectPath = getProjectPathFromProjectRoot(
    options.projectRoot,
    options.gradleRootDirectory,
  );

  if (tree.exists(filePath)) {
    const settingsContent = tree.read(filePath, 'utf-8') ?? '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${projectPath}')`,
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8') ?? '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude("${projectPath}")`,
    );
    tree.write(ktsFilePath, newSettingsContent);
  }
}

export function addLibraryToProjects(
  tree: Tree,
  options: {
    projectRoot: string;
    parsedProjects: string[];
    gradleRootDirectory: string;
  },
) {
  const regex = /dependencies\s*{/;
  const projectPath = getProjectPathFromProjectRoot(
    options.projectRoot,
    options.gradleRootDirectory,
  );

  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = path.join(projectRoot, 'build.gradle');
    const ktsPath = path.join(projectRoot, 'build.gradle.kts');

    if (tree.exists(filePath)) {
      const buildGradleContent = tree.read(filePath, 'utf-8') ?? '';
      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation project(':${projectPath}')`,
      );
      tree.write(filePath, newBuildGradleContent);
    }

    if (tree.exists(ktsPath)) {
      const buildGradleContent = tree.read(ktsPath, 'utf-8') ?? '';

      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation(project(":${projectPath}"))`,
      );
      tree.write(ktsPath, newBuildGradleContent);
    }
  }
}

export function getVersionManagement(
  tree: Tree,
  gradleRootDirectory: string,
): VersionManagementType {
  const filePath = joinPathFragments(
    gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  if (tree.exists(filePath)) {
    return 'version-catalog';
  }

  return 'properties';
}

export function findQuarkusVersion(
  framework: string | undefined,
  gradleRootDirectory: string,
  versionManagement: VersionManagementType,
) {
  let qVersion = '';
  if (framework === 'quarkus') {
    if (versionManagement === 'properties') {
      const gradlePropertiesPath = path.join(
        workspaceRoot,
        gradleRootDirectory,
        'gradle.properties',
      );
      const gradlePropertiesContent = fs.readFileSync(
        gradlePropertiesPath,
        'utf-8',
      );
      qVersion = getQuarkusVersion(gradlePropertiesContent);
    }

    if (!qVersion) {
      qVersion = quarkusVersion;
    }
  }

  return qVersion;
}
