import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Playwright 学習サイト'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(to bottom right, #1e3a8a, #3b82f6)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 80,
              marginRight: 20,
            }}
          >
            🎭
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
            }}
          >
            Playwright 学習サイト
          </div>
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#e0e7ff',
            textAlign: 'center',
            maxWidth: 900,
            marginTop: 20,
          }}
        >
          コードを書いて学ぶインタラクティブな学習ツール
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            gap: 30,
            fontSize: 24,
            color: '#dbeafe',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>🤖</span>
            <span>AI問題生成</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>📊</span>
            <span>進捗管理</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>🏆</span>
            <span>レベルアップ</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
