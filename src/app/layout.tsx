import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: {
    default: 'StickerVault',
    template: '%s | StickerVault',
  },
  description: 'Inventory Management System for your vinyl sticker business',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#0b0b10] text-zinc-100 antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1a24',
                color: '#e4e4ef',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#a855f7', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
