import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxBootMavenGeneratorSchema } from './schema';

describe('migrate generator', () => {
  let appTree: Tree;
  const options: NxBootMavenGeneratorSchema = {
    javaVersion: '17',
    groupId: 'com.example',
    parentProjectName: 'test-boot-multiproject',
    parentProjectVersion: '1.0.0',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const mvnwExists = appTree.exists('mvnw');
    expect(mvnwExists).toBeTruthy();
  });
});
