import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { join } from 'path';
import { DSLType, normalizeName } from '@jnxplus/common';
import { LinterType } from '@jnxplus/common';
import { NxBootGradleLibGeneratorSchema } from './schema';
import { getDsl } from '@jnxplus/gradle';

interface NormalizedSchema extends NxBootGradleLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
  linter?: LinterType;
  dsl: DSLType;
  kotlinExtension: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;

  let projectName: string;
  if (options.simpleName) {
    projectName = simpleProjectName;
  } else {
    projectName = options.directory
      ? `${normalizeName(
          names(options.directory).fileName
        )}-${simpleProjectName}`
      : simpleProjectName;
  }

  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}`
    : simpleProjectName;
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let packageName: string;
  if (options.simplePackageName) {
    packageName = `${options.groupId}.${names(
      simpleProjectName
    ).className.toLocaleLowerCase()}`.replace(new RegExp(/-/, 'g'), '');
  } else {
    packageName = `${options.groupId}.${
      options.directory
        ? `${names(options.directory).fileName.replace(
            new RegExp(/\//, 'g'),
            '.'
          )}.${names(simpleProjectName).className.toLocaleLowerCase()}`
        : names(simpleProjectName).className.toLocaleLowerCase()
    }`.replace(new RegExp(/-/, 'g'), '');
  }

  const packageDirectory = packageName.replace(new RegExp(/\./, 'g'), '/');

  const parsedProjects = options.projects
    ? options.projects.split(',').map((s) => s.trim())
    : [];

  const linter = options.language === 'java' ? 'checkstyle' : 'ktlint';

  const dsl = getDsl(tree);
  const kotlinExtension = dsl === 'kotlin' ? '.kts' : '';

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    packageName,
    packageDirectory,
    parsedProjects,
    linter,
    dsl,
    kotlinExtension,
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

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloService.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloServiceTests.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/TestConfiguration.${fileExtension}`
      )
    );

    if (options.language === 'kotlin') {
      tree.delete(
        joinPathFragments(
          options.projectRoot,
          `/src/test/resources/junit-platform.properties`
        )
      );
    }
  }
}

export default async function (
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.language === 'java') {
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
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-boot-gradle:test',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  } else {
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
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-boot-gradle:test',
        },
        ktformat: {
          executor: '@jnxplus/nx-boot-gradle:ktformat',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  }

  addFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  addLibraryToProjects(tree, normalizedOptions);
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
    const settingsContent = tree.read(filePath, 'utf-8') || '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${gradleProjectPath}')`
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8') || '';

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude("${gradleProjectPath}")`
    );
    tree.write(ktsFilePath, newSettingsContent);
  }
}

function addLibraryToProjects(tree: Tree, options: NormalizedSchema) {
  const regex = /dependencies\s*{/;
  const gradleProjectPath = options.projectRoot.replace(
    new RegExp('/', 'g'),
    ':'
  );
  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = join(projectRoot, `build.gradle`);
    const ktsPath = join(projectRoot, `build.gradle.kts`);

    if (tree.exists(filePath)) {
      const buildGradleContent = tree.read(filePath, 'utf-8') || '';
      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\nimplementation project(':${gradleProjectPath}')`
      );
      tree.write(filePath, newBuildGradleContent);
    }

    if (tree.exists(ktsPath)) {
      const buildGradleContent = tree.read(ktsPath, 'utf-8') || '';

      const newBuildGradleContent = buildGradleContent.replace(
        regex,
        `$&\nimplementation(project(":${gradleProjectPath}"))`
      );
      tree.write(ktsPath, newBuildGradleContent);
    }
  }
}
