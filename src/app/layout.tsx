import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron, Chakra_Petch, Share_Tech_Mono, Audiowide } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
})

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-chakra',
  weight: ['600', '700'],
  style: ['normal', 'italic'],
})

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-share-mono',
  weight: ['400'],
})

const audiowide = Audiowide({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-audiowide',
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'YAHA — Health Tracker',
  description: 'AI-powered health data tracking',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YAHA',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): React.ReactElement {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} ${chakraPetch.variable} ${shareTechMono.variable} ${audiowide.variable}`}>
      <body className="bg-background text-foreground overflow-hidden overscroll-none antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
