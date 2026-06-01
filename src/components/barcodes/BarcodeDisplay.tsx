'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Download, Printer, QrCode, Barcode as BarcodeIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  product: any
  onClose: () => void
}

export function BarcodeDisplay({ product, onClose }: Props) {
  const barcodeRef = useRef<HTMLCanvasElement>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('')

  useEffect(() => {
    // Generate barcode client-side for display
    const generateBarcode = async () => {
      try {
        if (barcodeRef.current) {
          const JsBarcode = (await import('jsbarcode')).default
          JsBarcode(barcodeRef.current, product.barcode, {
            format: 'CODE128',
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000',
          })
          setBarcodeDataUrl(barcodeRef.current.toDataURL('image/png'))
        }

        // QR code
        const QRCode = await import('qrcode')
        const qrUrl = await QRCode.default.toDataURL(product.barcode, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
        })
        setQrDataUrl(qrUrl)
      } catch (e) {
        console.error('Barcode generation error:', e)
      }
    }

    generateBarcode()
  }, [product.barcode])

  const downloadBarcode = () => {
    const link = document.createElement('a')
    link.href = `/api/products/${product.id}/barcode?type=barcode`
    link.download = `barcode-${product.sku}.png`
    link.click()
    toast.success('Barcode downloading...')
  }

  const downloadLabel = () => {
    const link = document.createElement('a')
    link.href = `/api/products/${product.id}/barcode?type=label`
    link.download = `label-${product.sku}.png`
    link.click()
    toast.success('Label downloading...')
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `qr-${product.sku}.png`
    link.click()
    toast.success('QR code downloading...')
  }

  const printLabel = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Label - ${product.name}</title>
        <style>
          body { margin: 0; padding: 20px; font-family: sans-serif; background: white; }
          .label { border: 1px solid #ccc; padding: 12px; width: 380px; }
          h3 { margin: 0 0 4px; font-size: 14px; }
          p { margin: 0 0 8px; font-size: 11px; color: #666; }
          .price { font-size: 16px; font-weight: bold; margin-bottom: 8px; }
          .codes { display: flex; gap: 12px; align-items: center; }
          img { max-width: 200px; }
          .qr { width: 80px; height: 80px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="label">
          <h3>${product.name}</h3>
          <p>SKU: ${product.sku}</p>
          ${parseFloat(product.salePrice) > 0 ? `<div class="price">£${parseFloat(product.salePrice).toFixed(2)}</div>` : ''}
          <div class="codes">
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="barcode" />` : ''}
            ${qrDataUrl ? `<img src="${qrDataUrl}" class="qr" alt="qr" />` : ''}
          </div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Barcode & QR Code</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Barcode */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarcodeIcon className="w-4 h-4 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">CODE-128 Barcode</p>
            </div>
            <div className="bg-white rounded-xl p-3 flex justify-center">
              <canvas ref={barcodeRef} className="max-w-full" />
            </div>
            <p className="text-center text-xs text-zinc-600 mt-1 font-mono">{product.barcode}</p>
          </div>

          {/* QR Code */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-zinc-600" />
              <p className="text-xs font-medium text-zinc-400">QR Code</p>
            </div>
            <div className="bg-white rounded-xl p-3 flex justify-center">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-32 h-32" />}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={downloadBarcode} className="btn-secondary justify-center text-xs py-2">
              <Download className="w-3.5 h-3.5" />
              Barcode PNG
            </button>
            <button onClick={downloadQR} className="btn-secondary justify-center text-xs py-2">
              <Download className="w-3.5 h-3.5" />
              QR Code PNG
            </button>
            <button onClick={downloadLabel} className="btn-secondary justify-center text-xs py-2">
              <Download className="w-3.5 h-3.5" />
              Full Label
            </button>
            <button onClick={printLabel} className="btn-primary justify-center text-xs py-2">
              <Printer className="w-3.5 h-3.5" />
              Print Label
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
