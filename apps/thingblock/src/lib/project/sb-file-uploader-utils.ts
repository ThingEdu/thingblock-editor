export const getProjectTitleFromFilename = (fileInputFilename: string | null | undefined): string => {
  if (!fileInputFilename) return ''
  // only parse title with the project extension (.tb)
  const matches = /^(.*)\.tb$/.exec(fileInputFilename)
  if (!matches) return ''
  return matches[1].substring(0, 100) // truncate project title to max 100 chars
}
