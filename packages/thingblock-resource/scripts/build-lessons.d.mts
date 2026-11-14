// Type declaration for build-lessons.mjs, consumed only by test/lessons/build-lessons.test.ts.
// TypeScript resolves this sibling `.d.mts` for the `.mjs` import automatically; the script itself
// stays plain ESM, matching the other files in scripts/.
export interface LessonIndexEntry {
  id: string
  name: string
  group: 'getting-started' | 'outputs' | 'motors' | 'inputs' | 'camera-ai'
  order: number
  image: string | null
  duration: number | null
  langs: string[]
  stepCount: number
  gradedCount: number
}

export function buildLessons(srcDir: string, outDir: string): { lessons: LessonIndexEntry[] }
