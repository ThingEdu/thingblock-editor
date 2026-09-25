export interface Report {
    id: number
    data: number[]
}

export interface ScannedDevice {
    id: string
    name?: string
    rssi?: number
}

export interface ScanCallbacks {
    onDevice (device: ScannedDevice): void
    onError (error: Error): void
}

export interface Transport {
    scan (callbacks: ScanCallbacks): () => void
    connect (device: ScannedDevice, onDisconnect?: () => void): Promise<void>
    send (packet: Uint8Array): void
    onReport (handler: (report: Report) => void): () => void
    disconnect (): void
    isConnected (): boolean
}
