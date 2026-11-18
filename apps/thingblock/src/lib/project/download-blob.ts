/**
 * Saves a blob through the browser's download.
 * @param filename The name to save it under.
 * @param blob The data.
 */
const downloadBlob = (filename: string, blob: Blob) => {
  const downloadLink = document.createElement('a')
  document.body.appendChild(downloadLink)

  const url = window.URL.createObjectURL(blob)
  downloadLink.href = url
  downloadLink.download = filename
  downloadLink.type = blob.type
  downloadLink.click()
  // remove the link after a timeout to prevent a crash on iOS 13 Safari
  window.setTimeout(() => {
    document.body.removeChild(downloadLink)
    window.URL.revokeObjectURL(url)
  }, 1000)
}

export default downloadBlob
