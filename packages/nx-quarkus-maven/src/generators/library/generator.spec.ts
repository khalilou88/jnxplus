import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { NxQuarkusMavenLibGeneratorSchema } from './schema';

describe('library generator', () => {
  let appTree: Tree;
  const options: NxQuarkusMavenLibGeneratorSchema = {
    name: 'test',
    language: 'java',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    parentProject: '',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './pom.xml',
      '<project><groupId>com.example</groupId><artifactId>quarkus-multi-module</artifactId><version>0.0.1-SNAPSHOT</version><modules></modules></project>'
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
