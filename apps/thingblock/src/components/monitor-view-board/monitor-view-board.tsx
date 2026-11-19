import { useEffect, useRef, useState } from 'react'
import { useVm } from '../../hooks/use-vm'
import MonitorView, { appendMonitorLogs, type MonitorLog } from '../monitor-view/monitor-view'

interface MonitorViewBoardProps {
  /** Whether the monitor fills the panel instead of keeping its own height. */
  fill?: boolean
}

/**
 * The serial monitor for the selected board: shows what the board writes, and sends it typed lines.
 * @param props - Whether the monitor fills the panel.
 * @returns The monitor, with the baud rate choice.
 */
const MonitorViewBoard = (props: MonitorViewBoardProps) => {
  const { fill = false } = props
  const vm = useVm()
  const [logs, setLogs] = useState<MonitorLog[]>([])
  // The link keeps the rate across remounts, and applies it when it opens the monitor
  const [baudRate, setBaudRate] = useState(() => vm.link.monitorBaud)
  // Serial chunks don't end at line ends, so the unfinished last line waits here for the next chunk
  const buffer = useRef('')

  useEffect(() => {
    const handleSerial = (chunk: string) => {
      const lines = (buffer.current + chunk).split('\n')
      buffer.current = lines.pop() ?? ''
      if (lines.length > 0) {
        setLogs((prev) =>
          appendMonitorLogs(
            prev,
            lines.map((line) => ({ message: line.replace(/\r$/, '') })),
          ),
        )
      }
    }
    vm.events.on('SERIAL_DATA', handleSerial)
    return () => {
      vm.events.off('SERIAL_DATA', handleSerial)
    }
  }, [vm])

  return (
    <MonitorView
      baudRate={baudRate}
      fill={fill}
      logs={logs}
      onBaudChange={(rate) => {
        setBaudRate(rate)
        vm.link.setMonitorBaud(rate)
      }}
      onClear={() => {
        setLogs([])
      }}
      // The board's reply, if any, comes back as serial data, so what is sent isn't echoed
      onSend={(value) => {
        vm.writeMonitor(value)
      }}
    />
  )
}

export default MonitorViewBoard
