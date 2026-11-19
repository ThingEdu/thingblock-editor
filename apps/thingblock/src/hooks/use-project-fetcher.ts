import { useEffect } from 'react'
import { useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../app/store'
import { loadPreference } from '../lib/preferences/user-preferences'
import defaultProject from '../lib/project/default-project'
import { BLOCKS_TAB_INDEX, activateTab } from '../reducers/editor-tab'
import { setProjectUnchanged } from '../reducers/project-changed'
import { LoadingState, onFetchedProjectData } from '../reducers/project-state'

/**
 * Builds the default project when one is requested, on the board the learner chose last time on this machine. Once
 * any project shows, marks it unchanged and opens the Blocks tab.
 */
export const useProjectFetcher = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const loadingState = useAppSelector((state) => state.scratchGui.projectState.loadingState)

  useEffect(() => {
    if (loadingState !== LoadingState.FETCHING_NEW_DEFAULT) return
    const project = defaultProject(intl.formatMessage)
    const device = loadPreference('device')
    dispatch(onFetchedProjectData(device ? { ...project, board: { device, peripherals: [] } } : project))
  }, [intl, dispatch, loadingState])

  useEffect(() => {
    if (loadingState !== LoadingState.SHOWING) return
    dispatch(setProjectUnchanged())
    dispatch(activateTab(BLOCKS_TAB_INDEX))
  }, [dispatch, loadingState])
}
