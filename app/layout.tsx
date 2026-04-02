import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
import './globals.css'
import { Providers } from './providers'
import DynamicAIChatButton from './components/DynamicAIChatButton'

export const metadata: Metadata = {
  title: 'Zebi - AI Business Operating System',
  description: 'AI-powered business operating system that helps entrepreneurs focus on what matters by automatically managing objectives, tasks, and blockers.',
  icons: {
    icon: '/favicon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} bg-[#F3F3F3] text-[#1A1C1C] font-sans`}>
        <Providers>
          {children}
          <DynamicAIChatButton />
        </Providers>
      </body>
    </html>
  )
}
