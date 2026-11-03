// packages/thingblock-sim/src/checker/thingbot-map.ts
/**
 * Friendly ThingBot names (L1, M1, S1…) to the PCA9685 channels and GPIO the board wires them to.
 * Mirrors the constants in thingblock-resource's thingbot-core/sim.ts; a test keeps the two in step.
 */
import type { LightName, MotorName, ServoName } from './rules'

export const LIGHT_CHANNEL: Record<LightName, number> = { L1: 15, L2: 13 }
export const BUZZER_CHANNEL = 14
export const MOTOR_CHANNELS: Record<MotorName, { a: number; b: number }> = {
  M1: { a: 2, b: 3 },
  M2: { a: 4, b: 5 },
  M3: { a: 7, b: 6 },
  M4: { a: 1, b: 0 },
}
export const SERVO_CHANNEL: Record<ServoName, number> = { S1: 12, S2: 11, S3: 10, S4: 9, S5: 8 }
export const SERVO_PULSE = { min: 102, max: 512 }
export const SWITCH_GPIO = 3

/**
 * The angle `servoSetAngle(ch, deg)` encoded as this duty, inverting its `map(deg, 0, 180, min, max)`.
 * @param duty The channel's duty out of 4096.
 * @returns The angle in degrees, rounded.
 */
export const dutyToAngle = (duty: number): number =>
  Math.round(((duty - SERVO_PULSE.min) * 180) / (SERVO_PULSE.max - SERVO_PULSE.min))
