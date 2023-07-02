import { TargetConfiguration, Tree, updateJson } from '@nx/devkit';

export function updateNxJson(tree: Tree, pluginName: string) {
  updateJson(tree, 'nx.json', (nxJson) => {
    // if plugins is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add plugin
    nxJson.plugins.push(pluginName);
    // return modified JSON object
    return nxJson;
  });
}

type TargetsType = {
  [targetName: string]: TargetConfiguration;
};

export function clearEmpties(o: TargetsType) {
  for (const k in o) {
    if (!o[k] || typeof o[k] !== 'object') {
      continue; // If null or not an object, skip to the next iteration
    }

    // The property is an object
    if (Object.keys(o[k]).length === 0) {
      delete o[k]; // The object had no properties, so delete that property
    }
  }

  return o;
}
