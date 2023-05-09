import { ExecutorContext, logger } from '@nx/devkit';

import version from '@jscutlery/semver/src/executors/version';
import { VersionBuilderSchema } from '@jscutlery/semver/src/executors/version/schema';
import * as fs from 'fs';
import path = require('path');

export default async function runExecutor(
  options: VersionBuilderSchema,
  context: ExecutorContext
) {
  logger.info(`Executor ran for Release: ${JSON.stringify(options)}`);
  //TODO pass updatePomXml to version executor to release a version
  return await version(options, context);
}

function updatePomXml({
  newVersion,
  projectRoot,
  projectName,
  dryRun,
}: {
  newVersion: string;
  projectRoot: string;
  projectName: string;
  dryRun: boolean;
}) {
  const pomXmlPath = path.join(projectRoot, 'pom.xml');
  const pomXmlContent = fs.readFileSync(pomXmlPath, 'utf-8');
  const newPomXmlContent = pomXmlContent.replace(
    /(?<=<version>).*(?=<\/version>)/,
    newVersion
  );
  fs.writeFileSync(pomXmlPath, newPomXmlContent);
}
