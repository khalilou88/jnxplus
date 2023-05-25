import { readXmlTree, xmlToString } from '../xml/index';
import { Tree, readProjectConfiguration } from '@nx/devkit';
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
