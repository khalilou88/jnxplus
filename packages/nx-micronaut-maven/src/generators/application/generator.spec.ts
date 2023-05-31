import { readProjectConfiguration, Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { NxMicronautMavenAppGeneratorSchema } from './schema';
import generator from './generator';

describe('application generator', () => {
  let appTree: Tree;
  const options: NxMicronautMavenAppGeneratorSchema = {
    name: 'test',
    language: 'java',
    groupId: 'com.example',
    projectVersion: '0.0.1-SNAPSHOT',
    configFormat: '.yml',
    parentProject: '',
    port: 8080,
  };

  beforeEach(() => {
    jest.setTimeout(60000);
    appTree = createTreeWithEmptyWorkspace();
    appTree.write(
      './pom.xml',
      `<project>
        <groupId>com.example</groupId>
        <artifactId>micronaut-multi-module</artifactId>
        <version>0.0.1-SNAPSHOT</version>
        <properties>
          <kotlin.version>1.7.22</kotlin.version>
        </properties>
        <modules></modules>
      </project>`
    );
  });

  //TODO this test don't work on macOS
  xit('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
