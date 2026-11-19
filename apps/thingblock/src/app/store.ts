import { useDispatch, useSelector } from 'react-redux'
import { type StoreEnhancer, combineReducers, legacy_createStore as createStore } from 'redux'
import { detectLocale } from '../lib/preferences/detect-locale'
import guiReducer, { buildInitialState } from '../reducers/gui'
import localesReducer, { initLocale, localesInitialState } from '../reducers/locales'

declare global {
  interface Window {
    /** Set by the Redux DevTools browser extension. */
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer
  }
}

const rootReducer = combineReducers({
  locales: localesReducer,
  scratchGui: guiReducer,
})

/** The editor's Redux state. */
export type RootState = ReturnType<typeof rootReducer>

// combineReducers infers the preloaded state only from reducers that take any action, and each reducer here takes
// only its own, so this names the full state as what the reducer starts from
const reducer: (state: RootState | undefined, action: Parameters<typeof rootReducer>[1]) => RootState = rootReducer

/**
 * Builds the editor's Redux store, in the locale `detectLocale` picks, with a new VM.
 * @returns A new store.
 */
export const createEditorStore = () => {
  const locale = detectLocale(Object.keys(localesInitialState.messagesByLocale))
  return createStore(
    reducer,
    { locales: initLocale(localesInitialState, locale), scratchGui: buildInitialState() },
    window.__REDUX_DEVTOOLS_EXTENSION__?.(),
  )
}

/** The editor's Redux store. */
export type EditorStore = ReturnType<typeof createEditorStore>

/** `useSelector`, typed with the editor's state. */
export const useAppSelector = useSelector.withTypes<RootState>()

/** `useDispatch`, typed with the editor's store. */
export const useAppDispatch = useDispatch.withTypes<EditorStore['dispatch']>()
