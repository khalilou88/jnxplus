import { Tree } from '@nrwl/devkit';
import { XmlDocument } from 'xmldoc';
import * as fs from 'fs';

export function readXmlTree(tree: Tree, path: string): XmlDocument {
  const fileText = tree.read(path)?.toString();
  if (!fileText) {
    throw new Error(`Unable to read ${path}`);
  }
  return new XmlDocument(fileText);
}

export function readXml(filePath: string): XmlDocument {
  const fileText = fs.readFileSync(filePath, 'utf-8');
  return new XmlDocument(fileText);
}
