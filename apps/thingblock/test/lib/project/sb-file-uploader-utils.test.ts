import { describe, expect, test } from 'vitest'
import { getProjectTitleFromFilename } from '../../../src/lib/project/sb-file-uploader-utils'

describe('getProjectTitleFromFilename', () => {
  test('takes the title from a .tb file name', () => {
    expect(getProjectTitleFromFilename('my project is great.tb')).toBe('my project is great')
  })

  test('gives a blank title for Scratch project files, which do not load', () => {
    expect(getProjectTitleFromFilename('my project is great.sb3')).toBe('')
    expect(getProjectTitleFromFilename('my project is great.sb2')).toBe('')
  })

  test('gives a blank title for a file name with no extension', () => {
    expect(getProjectTitleFromFilename('my project is great')).toBe('')
  })
})
