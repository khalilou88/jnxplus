import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxMavenGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: NxMavenGeneratorSchema = {
    javaVersion: 17,
    groupId: 'com.example',
    parentProjectName: 'test-boot-multiproject',
    parentProjectVersion: '1.0.0',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
    appTree.write('./.gitignore', '');
    appTree.write('./.prettierignore', '');
  });

  xit('should run successfully', async () => {
    await generator(appTree, options);
    const pomXmlExists = appTree.exists('pom.xml');
    expect(pomXmlExists).toBeTruthy();
  });
});
