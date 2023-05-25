import { Tree, updateJson } from '@nx/devkit';

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
