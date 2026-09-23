import {Map, OrderedMap} from 'immutable';

import {RuntimeEventNames, type RuntimeEmitter} from './runtime-events';

/** A `MonitorRecord`, or a partial map of its fields when updating. */
export type Monitor = Map<string, any>;

/** Owns the ordered monitor records shown in the GUI and publishes changes once per step. */
class MonitorHandler {
    events: RuntimeEmitter;
    _state = OrderedMap<string, Monitor>({});
    /** State as of the last emitted update. */
    _prevState = OrderedMap<string, Monitor>({});

    constructor (events: RuntimeEmitter) {
        this.events = events;
    }

    getState () {
        return this._state;
    }

    /** Adds the monitor, or merges its defined fields into the existing one with the same id. */
    add (monitor: Monitor) {
        if (!this.update(monitor)) {
            this._state = this._state.set(monitor.get('id'), monitor);
        }
    }

    /** Merges the defined fields into the existing monitor; false if no monitor has that id. */
    update (monitor: Monitor): boolean {
        const id = monitor.get('id');
        if (!this._state.has(id)) return false;
        // Undefined or null fields keep the previous value
        this._state = this._state.set(id, this._state.get(id).mergeWith(
            (prev, next) => ((typeof next === 'undefined' || next === null) ? prev : next),
            monitor
        ));
        return true;
    }

    remove (monitorId: string) {
        this._state = this._state.delete(monitorId);
    }

    hide (monitorId: string): boolean {
        return this.update(Map({id: monitorId, visible: false}));
    }

    show (monitorId: string): boolean {
        return this.update(Map({id: monitorId, visible: true}));
    }

    removeByTargetId (targetId: string) {
        this._state = this._state.filterNot(monitor => monitor.get('targetId') === targetId).toOrderedMap();
    }

    emitIfChanged () {
        if (!this._prevState.equals(this._state)) {
            this.events.emit(RuntimeEventNames.MONITORS_UPDATE, this._state);
            this._prevState = this._state;
        }
    }

    reset () {
        this._state = OrderedMap<string, Monitor>({});
    }
}

export default MonitorHandler;
