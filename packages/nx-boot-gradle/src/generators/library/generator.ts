import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import { join } from 'path';
import { NxBootGradleLibGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${projectName}`
    : projectName;
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const packageName = `${options.groupId}.${names(
    options.name
  ).className.toLocaleLowerCase()}`;
  const packageDirectory = `${options.groupId.replace(
    new RegExp(/\./, 'g'),
    '/'
  )}/${names(options.name).className.toLocaleLowerCase()}`;

  const parsedProjects = options.projects
    ? options.projects.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    packageName,
    packageDirectory,
    parsedProjects,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    join(__dirname, 'files', options.language),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@jnxplus/nx-boot-gradle:build',
      },
      lint: {
        executor: '@jnxplus/nx-boot-gradle:lint',
      },
      test: {
        executor: '@jnxplus/nx-boot-gradle:test',
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  addLibToProjects(tree, normalizedOptions);
  await formatFiles(tree);
}

function addProjectToGradleSetting(tree: Tree, options: NormalizedSchema) {
  const filePath = `settings.gradle`;
  const ktsFilePath = `settings.gradle.kts`;
  const regex = /.*rootProject\.name.*/;
  const gradleProjectPath = options.projectRoot.replace(
    new RegExp('/', 'g'),
    ':'
  );

  if (tree.exists(filePath)) {
    const settingsContent = tree.read(filePath, 'utf-8');

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${gradleProjectPath}')`
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8');

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude("${gradleProjectPath}")`
    );
    tree.write(ktsFilePath, newSettingsContent);
  }
}

function addLibToProjects(tree: Tree, options: NormalizedSchema) {
  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = join(projectRoot, `build.gradle`);

    const buildGradleContent = tree.read(filePath, 'utf-8');

    const regex = /dependencies\s*{/;
    const newBuildGradleContent = buildGradleContent.replace(
      regex,
      `$&\nimplementation project(':${options.projectRoot.replace(
        new RegExp('/', 'g'),
        ':'
      )}')`
    );
    tree.write(filePath, newBuildGradleContent);
  }
}
