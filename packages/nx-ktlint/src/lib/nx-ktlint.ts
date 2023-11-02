import { getBuildTool, ktlintVersion } from '@jnxplus/common';
import { readXml } from '@jnxplus/xml';
import { workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { readNxJson } from 'nx/src/config/configuration';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';

function readKtlintVersion(gradlePropertiesContent: string) {
  const regexp = /ktlintVersion=(.*)/g;
  const matches = (gradlePropertiesContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}

function getKtlintVersionMaven(dir: string) {
  const parentPomXmlPath = path.join(dir, 'pom.xml');

  let ktlintVersionXml = undefined;
  if (fs.existsSync(parentPomXmlPath)) {
    const parentPomXmlContent = readXml(parentPomXmlPath);
    ktlintVersionXml = parentPomXmlContent
      .childNamed('properties')
      ?.childNamed('ktlint.version');
  }

  return ktlintVersionXml === undefined ? ktlintVersion : ktlintVersionXml.val;
}

function getKtlintVersionGradle(dir: string) {
  const gradlePropertiesPath = path.join(dir, 'gradle.properties');
  let version = undefined;
  if (fs.existsSync(gradlePropertiesPath)) {
    const gradlePropertiesContent = fs.readFileSync(
      gradlePropertiesPath,
      'utf-8',
    );
    version = readKtlintVersion(gradlePropertiesContent);
  }
  return version === undefined ? ktlintVersion : version;
}

function getKtlintVersion(dir: string) {
  if (getBuildTool() === '@jnxplus/nx-gradle') {
    return getKtlintVersionGradle(dir);
  } else {
    return getKtlintVersionMaven(dir);
  }
}

export async function getKtlintPath(dir = workspaceRoot) {
  const version = getKtlintVersion(dir);

  const downloadUrl = `https://github.com/pinterest/ktlint/releases/download/${version}/ktlint`;

  let outputDirectory;
  const nxJson = readNxJson();
  if (nxJson.installation) {
    outputDirectory = path.join(
      dir,
      '.nx',
      'installation',
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'ktlint',
    );
  } else {
    outputDirectory = path.join(
      dir,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'ktlint',
    );
  }

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const ktlintAbsolutePath = path.join(outputDirectory, 'ktlint');
  if (!fs.existsSync(ktlintAbsolutePath)) {
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  } else if (isAnotherVersion(ktlintAbsolutePath, version)) {
    fs.unlinkSync(ktlintAbsolutePath);
    await downloadFile(downloadUrl, ktlintAbsolutePath);
  }
  return ktlintAbsolutePath;
}

function isAnotherVersion(ktlintAbsolutePath: string, version: string) {
  const jarVersion = execSync(`java -jar ${ktlintAbsolutePath} --version`)
    .toString()
    .trim();
  return jarVersion !== version;
}

const finished = promisify(stream.finished);
export async function downloadFile(
  fileUrl: string,
  outputLocationPath: string,
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
): Promise<any> {
  const writer = fs.createWriteStream(outputLocationPath);
  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  }).then((response) => {
    response.data.pipe(writer);
    return finished(writer); //this is a Promise
  });
}

export function isE2eTest(tmpWorkspaceRoot: string) {
  return (
    fs.existsSync(tmpWorkspaceRoot) && isSubdir(tmpWorkspaceRoot, process.cwd())
  );
}

function isSubdir(parentPath: string, childPath: string) {
  const relative = path.relative(parentPath, childPath);
  const isSubdir =
    relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  return isSubdir;
}
