import fs from 'node:fs/promises';
import path from 'node:path';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { notFound } from 'next/navigation';

import './markdown.css';

export default async function ConceptDocPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const dev = sp.dev;
  const isDev = dev === '1' || dev === 'true';

  // Only accessible in dev mode
  if (!isDev) notFound();

  const filePath = path.join(process.cwd(), 'docs', 'CONCEPT.md');
  const md = await fs.readFile(filePath, 'utf8');

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 960,
        margin: '0 auto',
        lineHeight: 1.6,
      }}
    >
      <div style={{ color: 'var(--muted)', fontWeight: 800, marginBottom: 10 }}>DEV DOCS</div>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </main>
  );
}
