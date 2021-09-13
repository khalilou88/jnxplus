import { readProjectConfiguration, Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxBootGradleGeneratorSchema } from './schema';

describe('application generator', () => {
  let appTree: Tree;
  const options: NxBootGradleGeneratorSchema = {
    name: 'test',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    appClassName: 'DemoApplication',
    packageName: 'com.example.demo',
    packageDirectory: 'com/example/demo',
    packaging: 'jar',
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
