import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({
  subsets: ["latin"],
  display: "swap",          // text visible while font loads
  preload: true,
  variable: "--font-geist",
})
const _geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  preload: false,           // mono font — don't block initial paint
  variable: "--font-geist-mono",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04010b",
}

export const metadata: Metadata = {
  title: 'AKTUHub - Smart Solutions for AKTU Students & Faculty',
  description:
    'AKTUHub is an all-in-one digital ecosystem for AKTU enrollment, document processing, study resources, faculty tools, and academic utilities.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/aktuhub-logo.png', media: '(prefers-color-scheme: light)' },
      { url: '/aktuhub-logo.png', media: '(prefers-color-scheme: dark)' },
      { url: '/aktuhub-logo.png', type: 'image/png' },
    ],
    apple: '/aktuhub-logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts CDN for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
