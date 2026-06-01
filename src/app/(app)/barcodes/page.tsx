'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ScanLine, Camera, X, Search, Download, Printer, QrCode,
  Barcode as BarcodeIcon, Package, CheckCircle, AlertCircle,
  ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, getStockStatusBg, humanizeStatus } from '@/lib/utils'
import { BarcodeDisplay } from '@/components/barcodes/BarcodeDisplay'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'

export default function BarcodesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'scan' | 'generate' | 'bulk'>('scan')
  const [scanning, setScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [foundProduct, setFoundProduct] = useState<any>(null)
  const [scanError, setScanError] = useState('')
  const [barcodeProduct, setBarcodeProduct] = useState<any>(null)
  const [adjustProduct, setAdjustProduct] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: allProducts } = useQuery({
    queryKey: ['products-for-barcodes'],
    queryFn: () => fetch('/api/products?limit=100').then((r) => r.json()),
    enabled: tab === 'generate' || tab === 'bulk',
  })

  const lookupCode = async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setScanError('')
    try {
      const r = await fetch(`/api/barcodes/scan?code=${encodeURIComponent(trimmed)}`)
      if (!r.ok) {
        setScanError(`No product found for: ${trimmed}`)
        setFoundProduct(null)
        return
      }
      const product = await r.json()
      setFoundProduct(product)
      toast.success(`Found: ${product.name}`)
    } catch {
      setScanError('Lookup failed')
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      startScanLoop()
    } catch (err: any) {
      toast.error('Camera access denied. Please allow camera permissions.')
    }
  }

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }, [])

  const startScanLoop = () => {
    // Use BarcodeDetector API if available
    if ('BarcodeDetector' in window) {
      const detector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
      })

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !scanning) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue
            setScannedCode(code)
            stopCamera()
            await lookupCode(code)
          }
        } catch {}
      }, 500)
    } else {
      toast.error('BarcodeDetector API not supported. Use manual entry.', { duration: 5000 })
    }
  }

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  const printAllBarcodes = () => {
    const products = allProducts?.products || []
    if (products.length === 0) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Barcodes</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .label { border: 1px solid #ccc; padding: 8px; text-align: center; page-break-inside: avoid; }
          h4 { font-size: 10px; margin: 0 0 4px; }
          p { font-size: 9px; color: #666; margin: 0; }
          @media print { body { padding: 5mm; } }
        </style>
      </head>
      <body>
        <div class="grid">
          ${products.map((p: any) => `
            <div class="label">
              <h4>${p.name.slice(0, 30)}</h4>
              <p>${p.sku}</p>
              <p style="font-family: monospace; font-size: 8px; margin-top: 4px;">${p.barcode}</p>
            </div>
          `).join('')}
        </div>
        <script>window.onload = () => window.print()</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="page-title">Barcodes</h1>
        <p className="page-subtitle">Scan, generate, and manage product barcodes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 w-fit">
        {[
          { id: 'scan', label: 'Scan', icon: ScanLine },
          { id: 'generate', label: 'Generate', icon: BarcodeIcon },
          { id: 'bulk', label: 'Bulk Print', icon: Printer },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Scan Tab */}
      {tab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Camera scanner */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-zinc-500" />
                Camera Scanner
              </h3>

              {!scanning ? (
                <div
                  className="border-2 border-dashed border-white/[0.1] rounded-xl aspect-video flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-500/30 transition-all"
                  onClick={startCamera}
                >
                  <Camera className="w-12 h-12 text-zinc-600" />
                  <div className="text-center">
                    <p className="text-sm text-zinc-400 font-medium">Tap to start scanning</p>
                    <p className="text-xs text-zinc-600 mt-1">Uses device camera to scan barcodes</p>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-32 border-2 border-purple-400 rounded-lg relative">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-purple-400 rounded-tl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-purple-400 rounded-tr" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-purple-400 rounded-bl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-purple-400 rounded-br" />
                      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-purple-400/60 animate-pulse" />
                    </div>
                  </div>
                  <button
                    onClick={stopCamera}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="text-xs text-white/70 bg-black/50 px-3 py-1 rounded-full">
                      Scanning for barcodes...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Manual entry */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-500" />
                Manual Entry
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupCode(manualCode)}
                  className="input-base flex-1 font-mono"
                  placeholder="Enter barcode or SKU..."
                />
                <button
                  onClick={() => lookupCode(manualCode)}
                  className="btn-primary px-4"
                >
                  Lookup
                </button>
              </div>
              {scannedCode && (
                <p className="text-xs text-zinc-600 mt-2 font-mono">Last scanned: {scannedCode}</p>
              )}
            </div>
          </div>

          {/* Result panel */}
          <div>
            {scanError && (
              <div className="glass-card p-5 border-red-500/20">
                <div className="flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Product not found</p>
                    <p className="text-xs text-red-400/70 mt-0.5">{scanError}</p>
                  </div>
                </div>
              </div>
            )}

            {foundProduct && (
              <div className="glass-card p-5 border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Product Found</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    {foundProduct.imageUrl
                      ? <img src={foundProduct.imageUrl} className="w-14 h-14 rounded-xl object-cover" alt="" />
                      : <Package className="w-7 h-7 text-zinc-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{foundProduct.name}</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{foundProduct.sku}</p>
                    <p className="text-xs text-zinc-500">{foundProduct.category?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-600">Stock</p>
                    <p className="text-xl font-bold text-white">{foundProduct.currentStock}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-600">Cost</p>
                    <p className="text-sm font-bold text-zinc-300">{formatCurrency(foundProduct.costPrice)}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-600">Price</p>
                    <p className="text-sm font-bold text-zinc-300">{formatCurrency(foundProduct.salePrice)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`badge ${getStockStatusBg(foundProduct.stockStatus)}`}>
                    {humanizeStatus(foundProduct.stockStatus)}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setBarcodeProduct(foundProduct)} className="btn-secondary py-1.5 text-xs">
                      <BarcodeIcon className="w-3.5 h-3.5" /> Barcode
                    </button>
                    <button onClick={() => setAdjustProduct(foundProduct)} className="btn-primary py-1.5 text-xs">
                      Adjust Stock
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!foundProduct && !scanError && (
              <div className="glass-card p-8 text-center">
                <ScanLine className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Scan or enter a barcode to look up a product</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generate Tab */}
      {tab === 'generate' && (
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">Product Barcodes</h3>
            <span className="text-xs text-zinc-600">{allProducts?.total || 0} products</span>
          </div>
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="hidden md:table-cell">Barcode</th>
                  <th className="hidden sm:table-cell">SKU</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allProducts?.products?.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <p className="text-sm text-zinc-300 font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-600 sm:hidden font-mono">{p.sku}</p>
                    </td>
                    <td className="hidden md:table-cell font-mono text-xs text-zinc-500">{p.barcode}</td>
                    <td className="hidden sm:table-cell font-mono text-xs text-zinc-500">{p.sku}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setBarcodeProduct(p)}
                          className="btn-secondary py-1 px-2 text-xs"
                        >
                          <BarcodeIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <a
                          href={`/api/products/${p.id}/barcode?type=label`}
                          download={`label-${p.sku}.png`}
                          className="btn-secondary py-1 px-2 text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Label</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Tab */}
      {tab === 'bulk' && (
        <div className="space-y-4">
          <div className="glass-card p-6 text-center space-y-4">
            <Printer className="w-10 h-10 text-zinc-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-white mb-1">Bulk Print Labels</h3>
              <p className="text-sm text-zinc-500">Print barcode labels for all active products in a grid layout suitable for label sheets.</p>
            </div>
            <button onClick={printAllBarcodes} className="btn-primary mx-auto">
              <Printer className="w-4 h-4" />
              Print All Labels ({allProducts?.total || 0} products)
            </button>
          </div>

          <div className="glass-card p-6 text-center space-y-4">
            <Download className="w-10 h-10 text-zinc-600 mx-auto" />
            <div>
              <h3 className="font-semibold text-white mb-1">Export Barcode List</h3>
              <p className="text-sm text-zinc-500">Download a CSV of all barcodes and SKUs for use in external systems.</p>
            </div>
            <a href="/api/reports?type=inventory&format=csv" className="btn-secondary mx-auto inline-flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download CSV
            </a>
          </div>
        </div>
      )}

      {barcodeProduct && <BarcodeDisplay product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSuccess={() => {
            setAdjustProduct(null)
            setFoundProduct(null)
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
    </div>
  )
}
