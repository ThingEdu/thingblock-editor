import { afterEach, expect, test, vi } from 'vitest'
import { loadPreference, savePreference } from '../../../src/lib/preferences/user-preferences'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

test('round-trips a value under a ThingBlock key', () => {
  savePreference('device', 'thingbot')
  expect(loadPreference('device')).toBe('thingbot')
  expect(localStorage.getItem('thingblock.device')).toBe('thingbot')
})

test('saving null forgets the value', () => {
  savePreference('device', 'thingbot')
  savePreference('device', null)
  expect(loadPreference('device')).toBeNull()
})

test('storage that throws (private mode, blocked) reads as nothing and saves nothing', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => {
    savePreference('locale', 'vi')
  }).not.toThrow()
  expect(loadPreference('locale')).toBeNull()
})
