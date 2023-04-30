import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import generator from './generator';
import { NxQuarkusMavenGeneratorSchema } from './schema';

describe('migrate generator', () => {
  let appTree: Tree;
  const options: NxQuarkusMavenGeneratorSchema = {
    javaVersion: '17',
    groupId: 'com.example',
    parentProjectName: 'test-quarkus-multiproject',
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
