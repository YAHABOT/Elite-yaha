import type { RefObject } from 'react'

export async function captureAndShare(ref: RefObject<HTMLDivElement | null>, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(ref.current!, {
    scale: 2,
    backgroundColor: '#0b1a28',
    logging: false,
    useCORS: true,
  })
  canvas.toBlob(async (blob) => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/jpeg' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'My YAHA Stats' })
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  }, 'image/jpeg', 0.92)
}
