import { readProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxBootGradleAppGeneratorSchema } from './schema';

describe('application generator', () => {
  let appTree: Tree;
  const options: NxBootGradleAppGeneratorSchema = {
    name: 'test',
    language: 'java',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    packaging: 'jar',
    configFormat: '.yml',
    minimal: false,
    port: 8080,
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './settings.gradle',
      "rootProject.name = 'boot-multi-project'"
    );
  });

  xit('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
