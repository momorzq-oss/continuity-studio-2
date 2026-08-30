# Shared layouts

## `app/layout.tsx`

The root layout supplies Geist Sans/Mono, dark mode, metadata, and the full-height application document.

```tsx
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://continuity-studio-2.momorabeeh.chatgpt.site'),
  title: 'Continuity Studio 2',
  description: 'A chat-first AI filmmaking workspace that remembers the whole production.',
  openGraph: {
    title: 'Continuity Studio 2',
    description: 'Your movie. One continuous conversation.',
    type: 'website',
    url: 'https://continuity-studio-2.momorabeeh.chatgpt.site',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Continuity Studio 2 — Your movie. One continuous conversation.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Continuity Studio 2',
    description: 'Your movie. One continuous conversation.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
```

## Application shell

`components/studio-app.tsx` owns the shared shell because the product is a single-route working surface. Its actual render branch begins at the `StudioApp` return and includes:

- 248px desktop sidebar / mobile overlay sidebar.
- 56px conversation header.
- Scrollable primary conversation or optional secondary workspace view.
- Bottom-gradient composer anchored over the conversation.
