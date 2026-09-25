export interface PeripheralListEntry {
    name: string
    peripheralId: string
    rssi: number
}

/** An extension that owns a hardware peripheral connection and brings its own transport. */
export interface PeripheralExtension {
    scan (): void
    connect (peripheralId: string): void
    disconnect (): void
    isConnected (): boolean
}

/** Routes scan, connect, disconnect and connection-state calls to the extension registered for an id. */
class PeripheralHandler {
    _extensions: Record<string, PeripheralExtension> = {};

    register (extensionId: string, extension: PeripheralExtension) {
        this._extensions[extensionId] = extension;
    }

    scan (extensionId: string) {
        this._extensions[extensionId]?.scan();
    }

    connect (extensionId: string, peripheralId: string) {
        this._extensions[extensionId]?.connect(peripheralId);
    }

    disconnect (extensionId: string) {
        this._extensions[extensionId]?.disconnect();
    }

    isConnected (extensionId: string): boolean {
        return this._extensions[extensionId]?.isConnected() ?? false;
    }
}

export default PeripheralHandler;
