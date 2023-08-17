import { MavenPluginType } from '@jnxplus/common';
import { readXmlTree, xmlToString } from '../xml';
import {
  Tree,
  readProjectConfiguration,
  updateJson,
  writeJson,
} from '@nx/devkit';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';

export function addProjectToAggregator(
  tree: Tree,
  options: { projectRoot: string; aggregatorProject: string | undefined }
) {
  const aggregatorProjectRoot = options.aggregatorProject
    ? readProjectConfiguration(tree, options.aggregatorProject).root
    : '';

  const parentProjectPomPath = path.join(aggregatorProjectRoot, 'pom.xml');
  const xmldoc = readXmlTree(tree, parentProjectPomPath);

  const relativePath = path
    .relative(aggregatorProjectRoot, options.projectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  const fragment = new XmlDocument(`<module>${relativePath}</module>`);

  let modules = xmldoc.childNamed('modules');

  if (modules === undefined) {
    xmldoc.children.push(
      new XmlDocument(`
    <modules>
    </modules>
  `)
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
  }
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
    `)
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

export function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const mavenIgnore =
    '\n# Maven\ntarget/\n!.mvn/wrapper/maven-wrapper.jar\n!**/src/main/**/target/\n!**/src/test/**/target/';

  const newContents = contents.concat(mavenIgnore);
  tree.write(filePath, newContents);
}

export function addOrUpdatePrettierRc(tree: Tree) {
  const prettierRcPath = `.prettierrc`;
  if (tree.exists(prettierRcPath)) {
    updateJson(tree, prettierRcPath, (prettierRcJson) => {
      prettierRcJson.xmlWhitespaceSensitivity = 'ignore';
      // return modified JSON object
      return prettierRcJson;
    });
  } else {
    writeJson(tree, prettierRcPath, {
      xmlWhitespaceSensitivity: 'ignore',
    });
  }
}

export function addOrUpdatePrettierIgnore(tree: Tree) {
  const prettierIgnorePath = `.prettierignore`;
  const mavenPrettierIgnore = '# Maven target\ntarget/';
  if (tree.exists(prettierIgnorePath)) {
    const prettierIgnoreOldContent =
      tree.read(prettierIgnorePath, 'utf-8') || '';
    const prettierIgnoreContent = prettierIgnoreOldContent.concat(
      '\n',
      mavenPrettierIgnore
    );
    tree.write(prettierIgnorePath, prettierIgnoreContent);
  } else {
    tree.write(prettierIgnorePath, mavenPrettierIgnore);
  }
}

export function addOrUpdateGitattributes(tree: Tree) {
  const gitattributesPath = `.gitattributes`;
  const mavenWrapperGitattributes =
    '# OS specific line endings for the Maven wrapper script\nmvnw text eol=lf\nmvnw.cmd text eol=crlf';
  if (tree.exists(gitattributesPath)) {
    const gitattributesOldContent = tree.read(gitattributesPath, 'utf-8') || '';
    const gitattributesContent = gitattributesOldContent.concat(
      '\n',
      mavenWrapperGitattributes
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, mavenWrapperGitattributes);
  }
}

export function addMissedProperties(
  plugin: MavenPluginType,
  tree: Tree,
  options: {
    framework: 'spring-boot' | 'quarkus' | 'micronaut' | 'none' | undefined;
    springBootVersion: string;
    quarkusVersion: string;
    micronautVersion: string;
  }
) {
  const xmldoc = readXmlTree(tree, 'pom.xml');

  //properties
  let properties = xmldoc.childNamed('properties');

  if (properties === undefined) {
    xmldoc.children.push(
      new XmlDocument(`
    <properties>
    </properties>
  `)
    );
    properties = xmldoc.childNamed('properties');
  }

  if (properties === undefined) {
    throw new Error('Properties tag undefined');
  }

  if (
    plugin === '@jnxplus/nx-boot-maven' ||
    options.framework === 'spring-boot'
  ) {
    const b = ifParentPomExits(xmldoc, 'spring-boot-starter-parent');
    if (!b) {
      const springBootVersion = properties.childNamed('spring.boot.version');
      if (springBootVersion === undefined) {
        properties.children.push(
          new XmlDocument(`
    <spring.boot.version>${options.springBootVersion}</spring.boot.version>
  `)
        );

        tree.write('pom.xml', xmlToString(xmldoc));
        return;
      }
    }
  }

  if (
    plugin === '@jnxplus/nx-quarkus-maven' ||
    options.framework === 'quarkus'
  ) {
    const quarkusVersion = properties.childNamed('quarkus.version');
    if (quarkusVersion === undefined) {
      properties.children.push(
        new XmlDocument(`
      <quarkus.version>${options.quarkusVersion}</quarkus.version>
    `)
      );
      tree.write('pom.xml', xmlToString(xmldoc));
      return;
    }
  }

  if (
    plugin === '@jnxplus/nx-micronaut-maven' ||
    options.framework === 'micronaut'
  ) {
    const b = ifParentPomExits(xmldoc, 'micronaut-parent');
    if (!b) {
      const micronautVersion = properties.childNamed('micronaut.version');
      if (micronautVersion === undefined) {
        properties.children.push(
          new XmlDocument(`
    <micronaut.version>${options.micronautVersion}</micronaut.version>
  `)
        );
        tree.write('pom.xml', xmlToString(xmldoc));
        return;
      }
    }
  }
}

export function ifParentPomExits(
  xmldoc: XmlDocument,
  parentPom: 'spring-boot-starter-parent' | 'micronaut-parent'
) {
  const parent = xmldoc.childNamed('parent');

  if (parent === undefined) {
    return false;
  }

  const artifactId = parent.childNamed('artifactId');

  return parentPom === artifactId?.val;
}
