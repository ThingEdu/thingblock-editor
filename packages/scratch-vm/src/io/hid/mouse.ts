import MathUtil from '../../util/math-util';

export interface MouseData {
    x?: number
    y?: number
    canvasWidth?: number
    canvasHeight?: number
    isDown?: boolean
}

class Mouse {
    _clientX = 0;
    _clientY = 0;
    /** Stage coordinates, clamped to the 480x360 stage and rounded. */
    _scratchX = 0;
    _scratchY = 0;
    _isDown = false;

    postData (data: MouseData) {
        if (data.x) {
            this._clientX = data.x;
            this._scratchX = Math.round(MathUtil.clamp(480 * ((data.x / data.canvasWidth) - 0.5), -240, 240));
        }
        if (data.y) {
            this._clientY = data.y;
            this._scratchY = Math.round(MathUtil.clamp(-360 * ((data.y / data.canvasHeight) - 0.5), -180, 180));
        }
        if (typeof data.isDown !== 'undefined') {
            this._isDown = data.isDown;
        }
    }

    getClientX () {
        return this._clientX;
    }

    getClientY () {
        return this._clientY;
    }

    getScratchX () {
        return this._scratchX;
    }

    getScratchY () {
        return this._scratchY;
    }

    getIsDown () {
        return this._isDown;
    }
}

export default Mouse;
