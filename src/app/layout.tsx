import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UCR Portal | Division of Television Studies',
  description: 'Official Mobile-First Academic & Administrative Portal for the Division of Television Studies, University College of Rathmalana.',
  applicationName: 'UCR Portal',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UCR Portal',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#5D4AE4',
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
