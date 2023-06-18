export { processProjectGraph } from './dep-graph/lookup-deps';

import initGenerator from './generators/init/generator';
import parentProjectGenerator from './generators/parent-project/generator';
import libraryGenerator from './generators/library/generator';
import applicationGenerator from './generators/application/generator';
import migrateGenerator from './generators/migrate/generator';

export {
  initGenerator,
  parentProjectGenerator,
  libraryGenerator,
  applicationGenerator,
  migrateGenerator,
};
