import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'AKTUHub - Smart Solutions for AKTU Students & Faculty',
  description:
    'AKTUHub is an all-in-one digital ecosystem for AKTU enrollment, document processing, study resources, faculty tools, and academic utilities.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/aktuhub-logo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/aktuhub-logo.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/aktuhub-logo.png',
        type: 'image/png',
      },
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
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
