export * from './lib/utils';
export * from './lib/utils/generators';
export * from './lib/xml';

import parentProjectGenerator from './generators/parent-project/generator';
import libraryGenerator from './generators/library/generator';
import applicationGenerator from './generators/application/generator';

export { parentProjectGenerator, libraryGenerator, applicationGenerator };
