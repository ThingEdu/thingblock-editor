import {EventEmitter} from 'events';

/**
 * The emitter a runtime and everything built on it emit and listen on. Each runtime gets its own, so
 * several runtimes in one process, as in tests, keep their events apart.
 */
export class EventBus extends EventEmitter {}
