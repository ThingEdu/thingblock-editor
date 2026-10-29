import type {LinkDevice} from './types';

/**
 * Build the arduino-cli FQBN, folding the device's board-menu option selections
 * (`getCompileConfig().options`, e.g. `PartitionScheme`) onto the base fqbn as `:k1=v1,k2=v2`.
 * arduino-cli takes these as part of the FQBN, not as separate compile options. Shared by every
 * backend: they all build through arduino-cli, so a divergence here is a wrong-board build.
 */
export const composeFqbn = (device: LinkDevice): string => {
    const {options = {}} = device.getCompileConfig();
    const menu = Object.entries(options)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    return menu ? `${device.fqbn}:${menu}` : device.fqbn;
};
