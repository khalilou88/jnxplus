import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import generator from './generator';
import { NxMavenLibGeneratorSchema } from './schema';

describe('library generator', () => {
  let appTree: Tree;
  const options: NxMavenLibGeneratorSchema = {
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
      '<project><groupId>com.example</groupId><artifactId>boot-multi-module</artifactId><version>0.0.1-SNAPSHOT</version><modules></modules></project>'
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
