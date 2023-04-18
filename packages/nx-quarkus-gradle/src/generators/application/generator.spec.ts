import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxQuarkusGradleAppGeneratorSchema } from './schema';

describe('application generator', () => {
  let appTree: Tree;
  const options: NxQuarkusGradleAppGeneratorSchema = {
    name: 'test',
    language: 'java',
    groupId: 'com.example',
    packageNameType: 'long',
    projectVersion: '0.0.1-SNAPSHOT',
    configFormat: '.yml',
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
