import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TV B11 | Division of Television Studies',
  description: 'Official Academic & Administrative Portal for the Division of Television Studies, University College of Rathmalana.',
  applicationName: 'TV B11',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TV B11',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0B0F17',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary antialiased selection:bg-play-purple selection:text-white">
        {children}
      </body>
    </html>
  );
}
