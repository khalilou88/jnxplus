import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { NxBootGradleGeneratorSchema } from './schema';

describe('application generator', () => {
  let appTree: Tree;
  const options: NxBootGradleGeneratorSchema = {
    name: 'test',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    packageName: 'com.example.demo',
    applicationClassName: 'DemoApplication',
    applicationClassDirectory: 'com/example/demo',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
