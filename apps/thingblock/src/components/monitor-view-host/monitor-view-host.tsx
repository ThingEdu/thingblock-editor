import { useEffect, useState } from 'react'
import { useVm } from '../../hooks/use-vm'
import MonitorView, { appendMonitorLogs, type MonitorLog } from '../monitor-view/monitor-view'

/**
 * The monitor for a project with no board: shows what the blocks print, and answers "ask and wait".
 * @returns The monitor, filling the panel.
 */
const MonitorViewHost = () => {
  const vm = useVm()
  const [logs, setLogs] = useState<MonitorLog[]>([])
  const [prompt, setPrompt] = useState<string | null>(null)

  useEffect(() => {
    const handlePrint = (message: string) => {
      setLogs((prev) => appendMonitorLogs(prev, [{ message }]))
    }
    const handleQuestion = (question: string | null) => {
      setPrompt(question)
    }
    vm.events.on('PRINT_TO_MONITOR', handlePrint)
    vm.events.on('QUESTION', handleQuestion)
    return () => {
      vm.events.off('PRINT_TO_MONITOR', handlePrint)
      vm.events.off('QUESTION', handleQuestion)
    }
  }, [vm])

  return (
    <MonitorView
      fill
      logs={logs}
      prompt={prompt}
      onClear={() => {
        setLogs([])
      }}
      onSend={(value) => {
        vm.writeMonitor(value)
        setPrompt(null)
      }}
    />
  )
}

export default MonitorViewHost
