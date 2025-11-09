import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Playwright 学習サイト',
  description: 'Playwrightのコードを実際に書いて学習できるインタラクティブな学習ツール',
  keywords: ['Playwright', 'E2Eテスト', 'プログラミング学習', 'テスト自動化', 'AI問題生成'],
  authors: [{ name: 'Playwright学習サイト' }],
  creator: 'Playwright学習サイト',
  publisher: 'Playwright学習サイト',
  metadataBase: new URL('https://www.playwright-study-site.org'),

  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://www.playwright-study-site.org',
    title: 'Playwright 学習サイト',
    description: 'Playwrightのコードを実際に書いて学習できるインタラクティブな学習ツール',
    siteName: 'Playwright 学習サイト',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Playwright 学習サイト',
    description: 'Playwrightのコードを実際に書いて学習できるインタラクティブな学習ツール',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T9NL92XN');`,
          }}
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-T9NL92XN"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  )
}
