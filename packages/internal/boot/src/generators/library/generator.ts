import { DSLType, LinterType } from '@jnxplus/common';
import { Tree, generateFiles, names, offsetFromRoot } from '@nx/devkit';
import { join } from 'path';
import { NxGradleLibGeneratorSchema } from './schema';

export interface NormalizedLibSchema extends NxGradleLibGeneratorSchema {
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

export function addFiles2(tree: Tree, options: NormalizedLibSchema) {
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
