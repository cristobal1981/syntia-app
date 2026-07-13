export function base64ToBlobUrl(mimetype: string, dataBase64: string): string {
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const blob = new Blob([bytes], { type: mimetype })
  return URL.createObjectURL(blob)
}

export function revokeBlobUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url)
  }
}
