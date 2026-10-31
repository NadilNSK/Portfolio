import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { heroData } from '../src/data/portfolioData.js';

test('Download CV offers a real same-origin PDF and serves its exact bytes', async () => {
  assert.equal(heroData.cvUrl, '/nadil-nandinu-cv.pdf');
  assert.equal(heroData.cvFilename, 'Nadil-Nandinu-CV.pdf');
  const pdf = await readFile(new URL('../public/nadil-nandinu-cv.pdf', import.meta.url));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false, ws: false } });
  try {
    const { default: Hero } = await server.ssrLoadModule('/src/components/Hero.jsx');
    const markup = renderToStaticMarkup(React.createElement(Hero));
    assert.match(markup, /href="\/nadil-nandinu-cv.pdf" download="Nadil-Nandinu-CV.pdf" type="application\/pdf"/);
    assert.match(markup, />Download CV<\/a>/);
    const { default: About } = await server.ssrLoadModule('/src/components/About.jsx');
    const about = renderToStaticMarkup(React.createElement(About));
    assert.match(about, /Computing and Information Systems/);
    assert.match(about, /Sabaragamuwa University of Sri Lanka/);
    assert.doesNotMatch(about, /Computer Science undergraduate/);
    await server.listen();
    const address = server.httpServer.address();
    const response = await fetch(`http://127.0.0.1:${address.port}${heroData.cvUrl}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type').split(';')[0], 'application/pdf');
    const served = Buffer.from(await response.arrayBuffer());
    assert.ok(served.equals(pdf), 'download contains the original bundled PDF bytes');
  } finally { await server.close(); }
});
