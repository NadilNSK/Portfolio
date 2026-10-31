import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('navigation exposes desktop links and makes the closed mobile menu inert', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Navbar } = await server.ssrLoadModule('/src/components/Navbar.jsx');
    for (const width of [320, 375, 768, 960, 1024, 1440]) {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        matchMedia: () => ({ matches: width <= 960 }),
      } });
      const markup = renderToStaticMarkup(React.createElement(Navbar, { activeSection: 'projects' }));
      assert.equal(/inert=""/.test(markup), width <= 960, 'closed menu accessibility at ' + width);
      assert.match(markup, /aria-controls="primary-navigation"/);
      assert.match(markup, /aria-expanded="false"/);
      assert.match(markup, /href="#projects" aria-current="location"/);
      for (const id of ['home', 'about', 'projects', 'skills-grid', 'contact']) {
        assert.ok(markup.includes(`href="#${id}"`), 'navigation destination ' + id);
      }
    }
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
    await server.close();
  }
});
