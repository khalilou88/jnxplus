export { processProjectGraph } from './dep-graph/lookup-deps';

import initGenerator from './generators/init/generator';
import libraryGenerator from './generators/library/generator';
import applicationGenerator from './generators/application/generator';

export { initGenerator, libraryGenerator, applicationGenerator };
