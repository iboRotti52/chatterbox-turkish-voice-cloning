import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';

const bodyFont = DM_Sans({ variable: '--font-body', subsets: ['latin', 'latin-ext'] });
const headingFont = Manrope({ variable: '--font-display', subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://ses-atolyesi-demo.ibrahimgozlukaya.chatgpt.site'),
  title: 'Ses Atölyesi — Türkçe ses klonlama demosu',
  description: 'Kısa bir ses örneğiyle Türkçe metni doğal bir sese dönüştürün.',
  openGraph: {
    title: 'Ses Atölyesi',
    description: 'Metnin, seçtiğin sesle konuşsun.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Ses Atölyesi ses dalgası' }],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ses Atölyesi',
    description: 'Metnin, seçtiğin sesle konuşsun.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
