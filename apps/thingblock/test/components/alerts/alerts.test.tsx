import { act, fireEvent, render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { createEditorStore } from '../../../src/app/store'
import Alerts from '../../../src/components/alerts/alerts'
import { showStandardAlert } from '../../../src/reducers/alerts'
import { storeWrapper } from '../../hooks/store-wrapper'

test('alerts show the store’s alerts, and closing one removes it', () => {
  const store = createEditorStore()
  const { getByLabelText, queryByText } = render(<Alerts />, { wrapper: storeWrapper(store) })

  act(() => {
    store.dispatch(showStandardAlert('savedToFile', { path: '/home/robot.tb' }))
  })
  expect(queryByText('Saved: /home/robot.tb')).not.toBeNull()

  fireEvent.click(getByLabelText('Close'))
  expect(queryByText('Saved: /home/robot.tb')).toBeNull()
  expect(store.getState().scratchGui.alerts.alertsList).toEqual([])
})
