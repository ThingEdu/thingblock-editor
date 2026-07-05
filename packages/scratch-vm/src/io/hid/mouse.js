const MathUtil = require('../../util/math-util');

class Mouse {
    constructor (runtime) {
        this._x = 0;
        this._y = 0;
        this._isDown = false;
        /**
         * Reference to the owning Runtime.
         * Can be used, for example, to activate hats.
         * @type{!Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Mouse DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        if (data.x) {
            this._clientX = data.x;
            this._scratchX = Math.round(MathUtil.clamp(
                480 * ((data.x / data.canvasWidth) - 0.5),
                -240,
                240
            ));
        }
        if (data.y) {
            this._clientY = data.y;
            this._scratchY = Math.round(MathUtil.clamp(
                -360 * ((data.y / data.canvasHeight) - 0.5),
                -180,
                180
            ));
        }
        if (typeof data.isDown !== 'undefined') {
            this._isDown = data.isDown;
        }
    }

    /**
     * Get the X position of the mouse in client coordinates.
     * @returns {number} Non-clamped X position of the mouse cursor.
     */
    getClientX () {
        return this._clientX;
    }

    /**
     * Get the Y position of the mouse in client coordinates.
     * @returns {number} Non-clamped Y position of the mouse cursor.
     */
    getClientY () {
        return this._clientY;
    }

    /**
     * Get the X position of the mouse in scratch coordinates.
     * @returns {number} Clamped and integer rounded X position of the mouse cursor.
     */
    getScratchX () {
        return this._scratchX;
    }

    /**
     * Get the Y position of the mouse in scratch coordinates.
     * @returns {number} Clamped and integer rounded Y position of the mouse cursor.
     */
    getScratchY () {
        return this._scratchY;
    }

    /**
     * Get the down state of the mouse.
     * @returns {boolean} Is the mouse down?
     */
    getIsDown () {
        return this._isDown;
    }
}

module.exports = Mouse;
