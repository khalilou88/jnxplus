import { readXmlTree, xmlToString } from '../xml/index';
import { Tree, readProjectConfiguration } from '@nx/devkit';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';

export function addProjectToAggregator(
  tree: Tree,
  options: { projectRoot: string; aggregator: string | undefined }
) {
  const aggregatorProjectRoot = options.aggregator
    ? readProjectConfiguration(tree, options.aggregator).root
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
