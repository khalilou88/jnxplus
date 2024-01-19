import { VersionManagementType } from '@jnxplus/common';
import { workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { join } from 'path';
import * as toml from '@iarna/toml';

export function addMissingCode(
  versionManagement: VersionManagementType,
  gradleRootDirectory: string,
  framework: string | undefined,
  language: string,
) {
  if (versionManagement !== 'version-catalog') {
    return;
  }

  const libsVersionsTomlPath = join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle',
    'libs.versions.toml',
  );

  const catalog = toml.parse(fs.readFileSync(libsVersionsTomlPath, 'utf-8'));

  console.log(catalog);
  console.log(framework);
  console.log(language);

  const str = toml.stringify(catalog);
  const libsVersionsTomlPath2 = join(
    workspaceRoot,
    gradleRootDirectory,
    'gradle',
    'libs.versions2.toml',
  );
  fs.writeFileSync(libsVersionsTomlPath2, str);
}
