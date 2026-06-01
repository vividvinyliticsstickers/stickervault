import QRCode from 'qrcode'

// Generate QR code as data URL
export async function generateQRCodeDataURL(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// Generate QR code as buffer
export async function generateQRCodeBuffer(value: string): Promise<Buffer> {
  return QRCode.toBuffer(value, { width: 200, margin: 2 }) as Promise<Buffer>
}

// Generate QR code as SVG string
export async function generateQRCodeSVG(value: string): Promise<string> {
  return QRCode.toString(value, { type: 'svg', margin: 2 })
}

// Generate a CODE-128 barcode as SVG (pure JS, no native deps)
export function generateBarcodeSVG(value: string, options?: {
  width?: number
  height?: number
  showText?: boolean
}): string {
  const height = options?.height || 80
  const showText = options?.showText !== false
  const barWidth = 2

  // CODE-128 encoding tables
  const CODE128_B: Record<string, number[]> = {}
  const chars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
  const patterns = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],
    [1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,2,1,3],[1,1,3,2,3,1],
    [3,1,3,1,2,1],[2,1,1,2,3,2],[2,1,1,1,3,3],[2,1,1,3,3,1],[2,1,3,1,1,3],
    [2,1,3,3,1,1],[2,3,3,1,1,1],[3,1,2,1,1,3],[3,1,1,1,2,3],[3,3,1,1,2,1],
    [3,1,2,3,1,1],[3,1,3,2,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],
    [4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],
    [1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],
    [1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],
    [4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],
    [1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],
    [4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],
    [1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],
    [4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],
    [4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2],
  ]

  chars.split('').forEach((c, i) => { CODE128_B[c] = patterns[i] })

  // Start B (index 104), stop (index 106)
  const startPattern = [2,1,1,4,1,2]
  const stopPattern = [2,3,3,1,1,1,2]

  // Build bar sequence
  let bars: Array<{ dark: boolean; width: number }> = []
  let checksum = 104

  const addPattern = (pattern: number[], startDark = true) => {
    pattern.forEach((w, i) => {
      bars.push({ dark: i % 2 === (startDark ? 0 : 1), width: w * barWidth })
    })
  }

  addPattern(startPattern)

  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    const code = chars.indexOf(char)
    if (code === -1) continue
    checksum += (i + 1) * code
    addPattern(patterns[code])
  }

  // Checksum
  const checksumVal = checksum % 103
  addPattern(patterns[checksumVal])
  addPattern(stopPattern)

  const totalWidth = bars.reduce((s, b) => s + b.width, 0) + 20
  const svgHeight = showText ? height + 20 : height

  let x = 10
  let rects = ''
  bars.forEach((bar) => {
    if (bar.dark) {
      rects += `<rect x="${x}" y="0" width="${bar.width}" height="${height}" fill="black"/>`
    }
    x += bar.width
  })

  const textEl = showText
    ? `<text x="${totalWidth / 2}" y="${height + 14}" text-anchor="middle" font-family="monospace" font-size="11" fill="black">${value}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${svgHeight}" viewBox="0 0 ${totalWidth} ${svgHeight}">
  <rect width="${totalWidth}" height="${svgHeight}" fill="white"/>
  ${rects}
  ${textEl}
</svg>`
}

// Generate printable label as SVG
export async function generateLabelSVG(product: {
  name: string
  sku: string
  barcode: string
  salePrice?: string | number
}): Promise<string> {
  const barcodeSvg = generateBarcodeSVG(product.barcode, { height: 60, showText: true })
  const qrSvg = await generateQRCodeSVG(product.barcode)

  // Extract inner content of barcode SVG
  const barcodeInner = barcodeSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')
  const qrInner = qrSvg.replace(/<svg[^>]*>/, '').replace('</svg>', '')

  const price = product.salePrice && parseFloat(product.salePrice.toString()) > 0
    ? `£${parseFloat(product.salePrice.toString()).toFixed(2)}`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="160" viewBox="0 0 400 160">
  <rect width="400" height="160" fill="white" stroke="#ccc" stroke-width="1"/>
  <text x="10" y="18" font-family="sans-serif" font-size="12" font-weight="bold" fill="black">${product.name.slice(0, 38)}</text>
  <text x="10" y="32" font-family="monospace" font-size="10" fill="#666">SKU: ${product.sku}</text>
  ${price ? `<text x="10" y="48" font-family="sans-serif" font-size="14" font-weight="bold" fill="black">${price}</text>` : ''}
  <g transform="translate(5, 55) scale(0.85)">${barcodeInner}</g>
  <g transform="translate(295, 50) scale(0.45)">${qrInner}</g>
</svg>`
}

// Convert SVG to PNG-like response (returns SVG as image/svg+xml)
export async function generateBarcodeBuffer(value: string): Promise<{ data: string; contentType: string }> {
  const svg = generateBarcodeSVG(value, { height: 80, showText: true })
  return { data: svg, contentType: 'image/svg+xml' }
}

export async function generateLabelBuffer(product: {
  name: string
  sku: string
  barcode: string
  salePrice?: string | number
}): Promise<{ data: string; contentType: string }> {
  const svg = await generateLabelSVG(product)
  return { data: svg, contentType: 'image/svg+xml' }
}
