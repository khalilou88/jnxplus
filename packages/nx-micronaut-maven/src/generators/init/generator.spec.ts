import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import generator from './generator';
import { NxMicronautMavenGeneratorSchema } from './schema';

describe('init generator', () => {
  let appTree: Tree;
  const options: NxMicronautMavenGeneratorSchema = {
    javaVersion: 17,
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
    const pomXmlExists = appTree.exists('pom.xml');
    expect(pomXmlExists).toBeTruthy();
  });
});
