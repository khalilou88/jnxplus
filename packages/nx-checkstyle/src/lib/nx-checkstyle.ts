import { workspaceRoot } from '@nx/devkit';
import axios from 'axios';
import * as fs from 'fs';
import { readNxJson } from 'nx/src/config/configuration';
import * as path from 'path';
import * as stream from 'stream';
import { promisify } from 'util';

export async function getCheckstylePath(dir = workspaceRoot) {
  const version = getCheckstyleVersion(dir);

  const checkstyleJarName = `checkstyle-${version}-all.jar`;
  const downloadUrl = `https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${version}/${checkstyleJarName}`;

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
      'checkstyle',
    );
  } else {
    outputDirectory = path.join(
      dir,
      'node_modules',
      '@jnxplus',
      'tools',
      'linters',
      'checkstyle',
    );
  }

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const checkstyleJarAbsolutePath = path.join(
    outputDirectory,
    checkstyleJarName,
  );

  if (!fs.existsSync(checkstyleJarAbsolutePath)) {
    await downloadFile(downloadUrl, checkstyleJarAbsolutePath);
  }
  return checkstyleJarAbsolutePath;
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
