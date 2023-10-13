import * as fs from 'fs';
import { Tree } from '@nx/devkit';
import { XmlDocument } from 'xmldoc';

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

export function xmlToString(xmldoc: XmlDocument) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    xmldoc.toString({ compressed: true, preserveWhitespace: true })
  );
}
