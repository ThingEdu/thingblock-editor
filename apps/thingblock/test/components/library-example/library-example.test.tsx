import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import LibraryExample from '../../../src/components/library-example/library-example'
import { openExampleLibrary } from '../../../src/reducers/modals'
import { renderInEditor, vmOf } from '../render-in-editor'

const base = 'http://host/resources/examples'
const index = {
  groups: ['K12 cơ bản', 'FanRoc'],
  examples: [
    {
      id: 'k12-01',
      file: 'thingbot/k12-01.tb',
      title: 'Đèn hội trăng rằm',
      group: 'K12 cơ bản',
      level: 1,
      description: 'Hai đèn nháy so le.',
      hardware: ['LED_1, LED_2 trên mạch'],
    },
    {
      id: 'k12-20',
      file: 'thingbot/k12-20.tb',
      title: 'Robot FanRoc hoàn chỉnh',
      group: 'FanRoc',
      level: 3,
      description: 'Mẫu robot thi đấu.',
      hardware: [],
    },
  ],
}

const setUp = (open = true) => {
  const store = createEditorStore()
  vi.spyOn(vmOf(store).devices, 'getExamplesOrigin').mockReturnValue(base)
  const fetch = vi.fn((url: string) =>
    Promise.resolve(
      url.endsWith('index.json') ? Response.json(index) : new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    ),
  )
  vi.stubGlobal('fetch', fetch)
  if (open) store.dispatch(openExampleLibrary())
  return { fetch, ...renderInEditor(<LibraryExample />, store) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('the library lists the pack’s examples, with a tag per group', async () => {
  const { fetch } = setUp()

  expect(await screen.findByRole('button', { name: /Đèn hội trăng rằm/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Robot FanRoc hoàn chỉnh/ })).toBeTruthy()
  expect(screen.getByText('LED_1, LED_2 trên mạch')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'K12 basics' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'FanRoc' })).toBeTruthy()
  expect(fetch).toHaveBeenCalledWith(`${base}/index.json`)
})

test('choosing an example closes the library and loads its .tb file', async () => {
  const { store, fetch } = setUp()
  vi.spyOn(vmOf(store).project, 'load').mockResolvedValue()

  fireEvent.click(await screen.findByRole('button', { name: /Robot FanRoc hoàn chỉnh/ }))

  expect(store.getState().scratchGui.modals.exampleLibrary).toBe(false)
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(`${base}/thingbot/k12-20.tb`)
  })
})

test('a closed library renders and fetches nothing', () => {
  const { container, fetch } = setUp(false)

  expect(container.innerHTML).toBe('')
  expect(fetch).not.toHaveBeenCalled()
})
