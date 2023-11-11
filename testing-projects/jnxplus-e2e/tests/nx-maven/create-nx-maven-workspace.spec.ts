import { createTestWorkspaceWithCustomCli } from '@jnxplus/internal/testing';
import { checkFilesExist } from '@nx/plugin/testing';
import { execSync } from 'child_process';
import { rmSync } from 'fs';

describe('create-nx-maven-workspace', () => {
  let workspaceDirectory: string;

  afterAll(() => {
    // Cleanup the test project
    rmSync(workspaceDirectory, {
      recursive: true,
      force: true,
    });
  });

  it('should be installed', () => {
    workspaceDirectory = createTestWorkspaceWithCustomCli(
      'create-nx-maven-workspace',
      '--javaVersion 17 --groupId com.example --parentProjectName root-project --parentProjectVersion 0.0.0 --mavenRootDirectory nx-maven --dependencyManagement spring-boot-parent-pom',
    );

    // npm ls will fail if the package is not installed properly
    execSync('npm ls @jnxplus/nx-maven', {
      cwd: workspaceDirectory,
      stdio: 'inherit',
    });

    expect(() =>
      checkFilesExist(
        'nx-maven/.mvn/wrapper/maven-wrapper.jar',
        'nx-maven/.mvn/wrapper/maven-wrapper.properties',
        'nx-maven/mvnw',
        'nx-maven/mvnw.cmd',
        'nx-maven/pom.xml',
      ),
    ).not.toThrow();
  });
});
