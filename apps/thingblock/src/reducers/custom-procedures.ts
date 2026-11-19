const ACTIVATE_CUSTOM_PROCEDURES = 'scratch-gui/custom-procedures/ACTIVATE_CUSTOM_PROCEDURES'
const DEACTIVATE_CUSTOM_PROCEDURES = 'scratch-gui/custom-procedures/DEACTIVATE_CUSTOM_PROCEDURES'

/** Called with the new mutator XML node when the procedure is done being edited. */
export type CustomProceduresCallback = (mutator: Element) => void

export interface CustomProceduresState {
  active: boolean
  mutator: Element | null
  callback: CustomProceduresCallback | null
}

type CustomProceduresAction =
  | { type: typeof ACTIVATE_CUSTOM_PROCEDURES; mutator: Element; callback: CustomProceduresCallback }
  | { type: typeof DEACTIVATE_CUSTOM_PROCEDURES; mutator: Element | null }

export const customProceduresInitialState: CustomProceduresState = {
  active: false,
  mutator: null,
  callback: null,
}

const reducer = (state = customProceduresInitialState, action: CustomProceduresAction): CustomProceduresState => {
  switch (action.type) {
    case ACTIVATE_CUSTOM_PROCEDURES:
      return { ...state, active: true, mutator: action.mutator, callback: action.callback }
    case DEACTIVATE_CUSTOM_PROCEDURES:
      // Can be called without a mutator to deactivate without new procedure
      // i.e. when clicking on the modal background
      if (action.mutator) {
        if (!state.callback) {
          throw new Error('custom-procedures: deactivated with a mutator but no callback is set')
        }
        state.callback(action.mutator)
      }
      return { ...state, active: false, mutator: null, callback: null }
    default:
      return state
  }
}

/**
 * Opens the custom procedures modal.
 * @param mutator - The XML node of the mutator for the procedure.
 * @param callback - Called with the new mutator node when the procedure is done being edited.
 * @returns The action.
 */
export const activateCustomProcedures = (
  mutator: Element,
  callback: CustomProceduresCallback,
): CustomProceduresAction => ({
  type: ACTIVATE_CUSTOM_PROCEDURES,
  mutator,
  callback,
})

/**
 * Closes the custom procedures modal.
 * @param mutator - The new mutator, or null if the callback should not be called.
 * @returns The action.
 */
export const deactivateCustomProcedures = (mutator: Element | null): CustomProceduresAction => ({
  type: DEACTIVATE_CUSTOM_PROCEDURES,
  mutator,
})

export default reducer
