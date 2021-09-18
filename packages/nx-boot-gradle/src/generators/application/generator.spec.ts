import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
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
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './settings.gradle',
      "rootProject.name = 'boot-multiproject'"
    );
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
