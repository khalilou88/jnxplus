import { readXmlTree, xmlToString } from '@jnxplus/xml';
import {
  NxJsonConfiguration,
  Tree,
  readJsonFile,
  readProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as cache from 'memory-cache';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';

export function getExecutable() {
  let executable = '';

  if (process.env['NX_SKIP_MAVEN_WRAPPER'] === 'true') {
    executable = 'mvn';
  } else {
    const isWrapperExists = isWrapperExistsFunction();

    if (isWrapperExists) {
      const isWin = process.platform === 'win32';
      executable = isWin ? 'mvnw.cmd' : './mvnw';
    } else {
      executable = 'mvn';
    }
  }

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    executable += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  return executable;
}

function isWrapperExistsFunction() {
  const mavenRootDirectory = getMavenRootDirectory();
  const mvnwPath = path.join(workspaceRoot, mavenRootDirectory, 'mvnw');
  return fs.existsSync(mvnwPath);
}

export function getMavenRootDirectory(): string {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const plugin = (nxJson?.plugins || []).find((p) =>
    typeof p === 'string'
      ? p === '@jnxplus/nx-maven'
      : p.plugin === '@jnxplus/nx-maven',
  );

  if (typeof plugin === 'string') {
    return '';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'mavenRootDirectory' in options &&
    typeof options.mavenRootDirectory === 'string'
  ) {
    return options.mavenRootDirectory;
  }

  return '';
}

export function addProjectToAggregator(
  tree: Tree,
  options: {
    projectRoot: string;
    aggregatorProject: string | undefined;
    mavenRootDirectory: string;
  },
) {
  const aggregatorProjectRoot = options.aggregatorProject
    ? readProjectConfiguration(tree, options.aggregatorProject).root
    : options.mavenRootDirectory
      ? options.mavenRootDirectory
      : '';

  const parentProjectPomPath = path.join(aggregatorProjectRoot, 'pom.xml');
  const xmldoc = readXmlTree(tree, parentProjectPomPath);

  const moduleRelativePath = path
    .relative(aggregatorProjectRoot, options.projectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  const fragment = new XmlDocument(`<module>${moduleRelativePath}</module>`);

  let modules = xmldoc.childNamed('modules');

  if (modules === undefined) {
    xmldoc.children.push(
      new XmlDocument(`
    <modules>
    </modules>
  `),
    );
    modules = xmldoc.childNamed('modules');
  }

  if (modules === undefined) {
    throw new Error('Modules tag undefined');
  }

  modules.children.push(fragment);

  tree.write(parentProjectPomPath, xmlToString(xmldoc));
}

export function addLibraryToProjects(
  tree: Tree,
  options: {
    parsedProjects: string[];
    groupId: string;
    projectName: string;
    projectVersion: string;
  },
) {
  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = path.join(projectRoot, `pom.xml`);
    const xmldoc = readXmlTree(tree, filePath);

    const dependency = new XmlDocument(`
		<dependency>
			<groupId>${options.groupId}</groupId>
			<artifactId>${options.projectName}</artifactId>
			<version>${options.projectVersion}</version>
		</dependency>
  `);

    let dependencies = xmldoc.childNamed('dependencies');

    if (dependencies === undefined) {
      xmldoc.children.push(
        new XmlDocument(`
      <dependencies>
      </dependencies>
    `),
      );
      dependencies = xmldoc.childNamed('dependencies');
    }

    if (dependencies === undefined) {
      throw new Error('Dependencies tag undefined');
    }

    dependencies.children.push(dependency);

    tree.write(filePath, xmlToString(xmldoc));
  }
}

export function addMissedProperties(
  tree: Tree,
  options: {
    framework: 'spring-boot' | 'quarkus' | 'micronaut' | 'none' | undefined;
    springBootVersion: string;
    quarkusVersion: string;
    micronautVersion: string;
    mavenRootDirectory: string;
  },
) {
  const pomPath = path.join(options.mavenRootDirectory, 'pom.xml');
  const xmldoc = readXmlTree(tree, pomPath);

  //properties
  let properties = xmldoc.childNamed('properties');

  if (properties === undefined) {
    xmldoc.children.push(
      new XmlDocument(`
    <properties>
    </properties>
  `),
    );
    properties = xmldoc.childNamed('properties');
  }

  if (properties === undefined) {
    throw new Error('Properties tag undefined');
  }

  if (options.framework === 'spring-boot') {
    const b = isParentPomExits(xmldoc, 'spring-boot-starter-parent');
    if (!b) {
      const springBootVersion = properties.childNamed('spring.boot.version');
      if (springBootVersion === undefined) {
        properties.children.push(
          new XmlDocument(`
    <spring.boot.version>${options.springBootVersion}</spring.boot.version>
  `),
        );

        tree.write(pomPath, xmlToString(xmldoc));
        return;
      }
    }
  }

  if (options.framework === 'quarkus') {
    const quarkusVersion = properties.childNamed('quarkus.version');
    if (quarkusVersion === undefined) {
      properties.children.push(
        new XmlDocument(`
      <quarkus.version>${options.quarkusVersion}</quarkus.version>
    `),
      );
      tree.write(pomPath, xmlToString(xmldoc));
      return;
    }
  }

  if (options.framework === 'micronaut') {
    const b = isParentPomExits(xmldoc, 'micronaut-parent');
    if (!b) {
      const micronautVersion = properties.childNamed('micronaut.version');
      if (micronautVersion === undefined) {
        properties.children.push(
          new XmlDocument(`
    <micronaut.version>${options.micronautVersion}</micronaut.version>
  `),
        );
        tree.write(pomPath, xmlToString(xmldoc));
        return;
      }
    }
  }
}

function isParentPomExits(
  xmldoc: XmlDocument,
  parentPom: 'spring-boot-starter-parent' | 'micronaut-parent',
) {
  const parentXml = xmldoc.childNamed('parent');

  if (parentXml === undefined) {
    return false;
  }

  const artifactIdXml = parentXml.childNamed('artifactId');

  return parentPom === artifactIdXml?.val;
}

export function getDependencyManagement(
  xmldoc: XmlDocument,
): 'bom' | 'spring-boot-parent-pom' | 'micronaut-parent-pom' {
  if (isParentPomExits(xmldoc, 'spring-boot-starter-parent')) {
    return 'spring-boot-parent-pom';
  }

  if (isParentPomExits(xmldoc, 'micronaut-parent')) {
    return 'micronaut-parent-pom';
  }

  return 'bom';
}

export function getLocalRepositoryRelativePath(): string {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const plugin = (nxJson?.plugins || []).find((p) =>
    typeof p === 'string'
      ? p === '@jnxplus/nx-maven'
      : p.plugin === '@jnxplus/nx-maven',
  );

  if (typeof plugin === 'string') {
    return '';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'localRepositoryRelativePath' in options &&
    typeof options.localRepositoryRelativePath === 'string'
  ) {
    return options.localRepositoryRelativePath;
  }

  return '';
}

export function getLocalRepositoryPath(mavenRootDirAbsolutePath: string) {
  const key = 'localRepositoryPath';
  const cachedLocalRepository = cache.get(key);
  if (cachedLocalRepository) {
    return cachedLocalRepository;
  }

  let localRepositoryRelativePath = getLocalRepositoryRelativePath();
  if (localRepositoryRelativePath) {
    const mavenRootDirectory = getMavenRootDirectory();
    localRepositoryRelativePath = path.join(
      '{workspaceRoot}',
      mavenRootDirectory,
      localRepositoryRelativePath,
    );
  } else {
    localRepositoryRelativePath = execSync(
      `${getExecutable()} help:evaluate -Dexpression=settings.localRepository -q -DforceStdout`,
      {
        cwd: mavenRootDirAbsolutePath,
      },
    )
      .toString()
      .trim();
  }

  // Store localRepositoryPath in cache for future use
  cache.put(key, localRepositoryRelativePath, 60000); // Cache for 60 seconds

  return localRepositoryRelativePath;
}
