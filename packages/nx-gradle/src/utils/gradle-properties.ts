import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PropertiesReader = require('properties-reader');

export function updateFile(gradleDir: string) {
  const contents = fs.readFileSync(`${gradleDir}/gradle.properties`, 'utf8');
  const properties = PropertiesReader();
  properties.read(contents);
  const versionCode = properties.get('VERSION_CODE');
  properties.set('VERSION_NAME', '1.0.0');
  properties.set('VERSION_CODE', versionCode + 1);
  let output = '';
  properties.each((key: string, value: string) => {
    output += `\n${key}=${value}`;
  });
  fs.writeFileSync(`${gradleDir}/gradle.properties`, output);
}
