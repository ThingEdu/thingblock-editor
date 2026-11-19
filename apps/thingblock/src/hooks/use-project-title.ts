import { useEffect, useRef } from 'react'
import { defineMessages, useIntl } from 'react-intl'
import { useAppDispatch, useAppSelector } from '../app/store'
import { LoadingState } from '../reducers/project-state'
import { setProjectTitle } from '../reducers/project-title'

const messages = defineMessages({
  defaultProjectTitle: {
    id: 'gui.gui.defaultProjectTitle',
    description: 'Default title for project',
    defaultMessage: 'ThingBlock Project',
  },
})

/** Gives a new project the default title, and keeps that title in the editor's language. */
export const useProjectTitle = () => {
  const intl = useIntl()
  const dispatch = useAppDispatch()
  const title = useAppSelector((state) => state.scratchGui.projectTitle)
  const loadingState = useAppSelector((state) => state.scratchGui.projectState.loadingState)
  const defaultTitle = intl.formatMessage(messages.defaultProjectTitle)
  const previousDefaultTitle = useRef(defaultTitle)

  useEffect(() => {
    if (loadingState === LoadingState.FETCHING_NEW_DEFAULT) dispatch(setProjectTitle(defaultTitle))
  }, [dispatch, loadingState, defaultTitle])

  useEffect(() => {
    if (defaultTitle === previousDefaultTitle.current) return
    // A project still on the previous language's default title would otherwise be saved under that name
    if (title === previousDefaultTitle.current) dispatch(setProjectTitle(defaultTitle))
    previousDefaultTitle.current = defaultTitle
  }, [dispatch, title, defaultTitle])
}
