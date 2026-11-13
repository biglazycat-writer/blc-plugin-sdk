export const apiVersion = 1;
export const apiRevision = 1;
export { PluginError, waitForTask, readDocument } from './helpers.mjs';
export function definePlugin(activate) {
  if (typeof activate !== 'function') throw new TypeError('definePlugin expects activate(context)');
  return { activate };
}
