import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { NxQuarkusGradleLibGeneratorSchema } from './schema';

describe('library generator', () => {
  let appTree: Tree;
  const options: NxQuarkusGradleLibGeneratorSchema = {
    name: 'test',
    language: 'java',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './settings.gradle',
      "rootProject.name = 'quarkus-root-project'"
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
