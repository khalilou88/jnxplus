import { Tree } from '@nx/devkit';
import initGenerator from '../init/generator';
import { PresetGeneratorSchema } from './schema';

export async function presetGenerator(
  tree: Tree,
  options: PresetGeneratorSchema,
) {
  await initGenerator(tree, options);
}

export default presetGenerator;
