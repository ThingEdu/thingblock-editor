import * as ScratchBlocks from '@thingblock/thingblock-blocks'
import type VM from '@thingblock/thingblock-vm'

/**
 * Connects scratch-blocks with the VM.
 * @param vm The VM the blocks report to.
 * @returns ScratchBlocks, connected.
 */
const connectBlocks = (vm: VM) => {
  ScratchBlocks.CheckboxBubble.prototype.isChecked = (blockId: string) =>
    vm.runtime.monitorBlocks.getBlock(blockId)?.isMonitored ?? false

  ScratchBlocks.StatusIndicatorLabel.prototype.getExtensionState = (extensionId: string) =>
    vm.getPeripheralIsConnected(extensionId)
      ? ScratchBlocks.StatusButtonState.READY
      : ScratchBlocks.StatusButtonState.NOT_READY

  return ScratchBlocks
}

export default connectBlocks
