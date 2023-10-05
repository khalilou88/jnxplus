export function getExecutable() {
  const isWin = process.platform === 'win32';
  let executable = isWin ? 'gradlew.bat' : './gradlew';

  if (process.env['NX_GRADLE_CLI_OPTS']) {
    executable += ` ${process.env['NX_GRADLE_CLI_OPTS']}`;
  }

  return executable;
}
