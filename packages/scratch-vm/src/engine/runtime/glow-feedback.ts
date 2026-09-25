import type Runtime from '../runtime';
import type Thread from '../thread';

/** Turns script glows on and off as the editing target's threads start and stop. */
class GlowFeedback {
    runtime: Runtime;
    /** Top block IDs of the scripts glowing during the previous frame. */
    _scriptGlowsPreviousFrame: string[] = [];

    constructor (runtime: Runtime) {
        this.runtime = runtime;
    }

    /** Emits glow on/off for the scripts whose glow changed this frame; `optExtraThreads` are ones that just ended. */
    update (optExtraThreads?: Thread[]) {
        const searchThreads = [...this.runtime.threads, ...(optExtraThreads ?? [])];
        const requestedGlowsThisFrame: string[] = [];
        for (const thread of searchThreads) {
            const target = thread.target;
            if (target !== this.runtime.getEditingTarget()) continue;
            if (!thread.requestScriptGlowInFrame && !thread.stackClick) continue;
            // A block clicked in the flyout is not in the target's blocks
            const script = target.blocks.getTopLevelScript(thread.blockGlowInFrame) ??
                this.runtime.flyoutBlocks.getTopLevelScript(thread.blockGlowInFrame);
            if (script) {
                requestedGlowsThisFrame.push(script);
            }
        }

        const finalScriptGlows: string[] = [];
        for (const previousFrameGlow of this._scriptGlowsPreviousFrame) {
            if (requestedGlowsThisFrame.includes(previousFrameGlow)) {
                finalScriptGlows.push(previousFrameGlow);
            } else {
                this.runtime.glowScript(previousFrameGlow, false);
            }
        }
        for (const currentFrameGlow of requestedGlowsThisFrame) {
            if (!this._scriptGlowsPreviousFrame.includes(currentFrameGlow)) {
                this.runtime.glowScript(currentFrameGlow, true);
                finalScriptGlows.push(currentFrameGlow);
            }
        }
        this._scriptGlowsPreviousFrame = finalScriptGlows;
    }

    /** Forgets a script's glow without emitting glow-off, e.g. when the script was just deleted. */
    quiet (scriptBlockId: string) {
        const index = this._scriptGlowsPreviousFrame.indexOf(scriptBlockId);
        if (index > -1) {
            this._scriptGlowsPreviousFrame.splice(index, 1);
        }
    }

    /** Drops all tracked glows without emitting glow-off, e.g. when the editing target changes. */
    clear () {
        this._scriptGlowsPreviousFrame = [];
    }
}

export default GlowFeedback;
