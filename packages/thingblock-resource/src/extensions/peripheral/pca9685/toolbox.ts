/** Toolbox category for the PCA9685 16-channel PWM driver peripheral. */
import type { ToolboxCategory } from '../../../shared/types'

const whole = (num: number) => ({ type: 'math_whole_number', fields: { NUM: num } })
const angle = { type: 'math_angle', fields: { NUM: 90 } }

const toolbox: ToolboxCategory = {
  kind: 'category',
  name: 'PCA9685',
  colour: '#9F4D95',
  contents: [
    { kind: 'block', type: 'pca9685_init', inputs: { ADDR: whole(0) } },
    { kind: 'block', type: 'pca9685_setToServoMode' },
    { kind: 'block', type: 'pca9685_setServoAngle', inputs: { ANGLE: angle } },
    { kind: 'block', type: 'pca9685_setAllServoAngle', inputs: { ANGLE: angle } },
    { kind: 'block', type: 'pca9685_setPWMFrequency', inputs: { FREQ: whole(200) } },
    { kind: 'block', type: 'pca9685_setChannelPWM', inputs: { VALUE: whole(4096) } },
    { kind: 'block', type: 'pca9685_setAllChannelPWM', inputs: { VALUE: whole(4096) } },
  ],
}

export default toolbox
