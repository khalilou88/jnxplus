import { DSLType, getProjectRoot } from '@jnxplus/common';
import {
  ExecutorContext,
  NxJsonConfiguration,
  Tree,
  joinPathFragments,
  readJsonFile,
  readProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';

export function getProjectPath(
  context: ExecutorContext,
  gradleRootDirectory: string,
) {
  const projectRoot = getProjectRoot(context);
  return getProjectPathFromProjectRoot(projectRoot, gradleRootDirectory);
}

export function getProjectPathFromProjectRoot(
  projectRoot: string,
  gradleRootDirectory: string,
) {
  //Remove first dot
  let replacedString = projectRoot.replace(new RegExp('^\\.', 'g'), '');

  //Remove /gradleRootDirectory if exists
  if (gradleRootDirectory) {
    replacedString = replacedString.replace(
      new RegExp(`^\\/?${gradleRootDirectory}`, 'g'),
      '',
    );
  }

  return replacedString.replace(new RegExp('/', 'g'), ':');
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
    const settingsContent = tree.read(filePath, 'utf-8') || '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${projectPath}')`,
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8') || '';

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
    const filePath = join(projectRoot, `build.gradle`);
    const ktsPath = join(projectRoot, `build.gradle.kts`);

    if (tree.exists(filePath)) {
      const buildGradleContent = tree.read(filePath, 'utf-8') || '';
      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation project(':${projectPath}')`,
      );
      tree.write(filePath, newBuildGradleContent);
    }

    if (tree.exists(ktsPath)) {
      const buildGradleContent = tree.read(ktsPath, 'utf-8') || '';

      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\n\timplementation(project(":${projectPath}"))`,
      );
      tree.write(ktsPath, newBuildGradleContent);
    }
  }
}

export function getProjectName(
  projectRoot: string,
  isProjectJsonExists?: boolean,
) {
  const gradleRootDirectory = getGradleRootDirectory();
  const projectJsonPath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'project.json',
  );
  const settingsGradlePath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'settings.gradle',
  );
  const settingsGradleKtsPath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'settings.gradle.kts',
  );

  if (isProjectJsonExists || fs.existsSync(projectJsonPath)) {
    const projectJson = readJsonFile(projectJsonPath);
    return projectJson.name;
  } else if (!projectRoot || projectRoot === '.') {
    const json = JSON.parse(
      fs.readFileSync(join(workspaceRoot, 'package.json')).toString(),
    );
    return json.name;
  } else if (fs.existsSync(settingsGradlePath)) {
    const settingsGradleContent = fs.readFileSync(settingsGradlePath, 'utf-8');
    return getRootProjectName(settingsGradleContent);
  } else if (fs.existsSync(settingsGradleKtsPath)) {
    const settingsGradleKtsContent = fs.readFileSync(
      settingsGradleKtsPath,
      'utf-8',
    );
    return getRootProjectName(settingsGradleKtsContent);
  }

  return generateName(projectRoot);
}

function generateName(projectRoot: string) {
  return projectRoot
    .replace(new RegExp('^\\.', 'g'), '')
    .replace(new RegExp('/', 'g'), '-');
}
