import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Sidebar } from '@/components/sidebar'
import { ToastProvider } from '@/components/providers'
import { UploadProvider } from '@/components/upload-context'
import { ShortcutsButton } from '@/components/shortcuts-button'
import './globals.css'

const geistSans = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'CADSentinel — Drawing Compliance Validation',
  description:
    'Automated compliance validation for hydraulic cylinder engineering drawings at JIT Industries.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#0f1e35',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`bg-background ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <ToastProvider>
          <UploadProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">{children}</div>
            </div>
            <ShortcutsButton />
          </UploadProvider>
        </ToastProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
