import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

// Fixture institutions and credentials below are test data, never portfolio claims.
test('education renders verified defaults and optional qualification hierarchy without fake links', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { default: Education } = await server.ssrLoadModule('/src/components/Education.jsx');
    const actual = renderToStaticMarkup(React.createElement(Education));
    assert.equal((actual.match(/<section\b/g) || []).length, 1, 'scrollspy sees only the outer section');
    assert.match(actual, /id="education"/);
    assert.equal((actual.match(/class="education-electricity"/g) || []).length, 2, 'education and certificate groups share the circuit effect');
    assert.match(actual, /class="education-timeline-wrap education-certification-wrap"/);
    assert.match(actual, /Certifications and achievements\. Use the arrow keys to change circuit direction\./);
    assert.match(actual, /<ol class="education-certification-grid"/);
    assert.match(actual, /data-active="false" data-direction="down"/);
    assert.match(actual, /preserveAspectRatio="none" aria-hidden="true" focusable="false"/);
    assert.doesNotMatch(actual, /<circle\b/);
    assert.match(actual, /aria-labelledby="education-heading"/);
    assert.match(actual, /BSc \(Hons\) in Computing and Information Systems/);
    assert.match(actual, /Sabaragamuwa University of Sri Lanka/);
    assert.match(actual, /Belihuloya, Sri Lanka/);
    assert.match(actual, /2024 - Present/);
    assert.match(actual, /In progress/);
    assert.match(actual, /Ananda Sastralaya National School/);
    assert.match(actual, /G.C.E. Advanced Level - Physical Stream/);
    assert.match(actual, /2020 - 2022/);
    assert.match(actual, /Agentic AI Fundamentals: Architectures, Frameworks, and Applications/);
    assert.match(actual, /University Category of the SLIoT Challenge 2026/);
    assert.match(actual, /MoraXtreme 10.0/);
    assert.match(actual, /href="https:\/\/lnkd.in\/p\/gppTGcvP"/);
    assert.match(actual, /1st9qb9eRCaG7neDg0ofaFdvCFQM_ekF7/);
    assert.match(actual, /10Hj1W4xLwyOI9UhK3pSKcJim-g41Usuc/);
    assert.equal((actual.match(/<h4>/g) || []).length, 5);
    assert.doesNotMatch(actual, /No certifications listed yet|href="#"|<select/);
    assert.doesNotMatch(actual, /Richmond|Tharusha|IJSE/);

    const fixture = renderToStaticMarkup(React.createElement(Education, {
      education: [{
        id: 'fixture-study', qualification: 'Test qualification', level: 'Test level',
        institution: 'Fixture institution', location: 'Fixture location', period: '2020 - 2024',
        status: 'Completed', summary: 'Fixture academic summary', highlights: ['Topic A'],
        curriculum: [{ title: 'Core subjects', items: ['Subject A', { title: 'Subject B', code: 'TEST02' }] }],
        semesters: [
          { id: 'one', title: 'Semester 1', courses: [{ title: 'Foundations', code: 'TEST01', credits: 3 }] },
          { id: 'two', title: 'Semester 2', courses: ['Advanced subject'] },
        ],
      }],
      certifications: [{ id: 'fixture-cert', title: 'Fixture certificate', issuer: 'Fixture issuer', credentialUrl: 'https://example.com/credential' }],
    }));
    assert.equal((fixture.match(/<section\b/g) || []).length, 1);
    assert.match(fixture, /Fixture institution/);
    assert.match(fixture, /Fixture location/);
    assert.match(fixture, /2020 - 2024/);
    assert.match(fixture, /Core subjects/);
    assert.match(fixture, /Subject A/);
    assert.match(fixture, /TEST02/);
    assert.match(fixture, /Semester breakdown/);
    assert.match(fixture, /<option value="0" selected="">Semester 1/);
    assert.match(fixture, /<option value="1">Semester 2/);
    assert.match(fixture, /Foundations/);
    assert.match(fixture, /3 credits/);
    assert.match(fixture, /Fixture issuer/);
    assert.match(fixture, /href="https:\/\/example.com\/credential"/);
    assert.match(fixture, /rel="noopener noreferrer"/);
    assert.doesNotMatch(fixture, /No certifications listed yet/);
    assert.doesNotMatch(fixture, /class="education-electricity"/, 'single-card groups have no dangling connectors');

    const empty = renderToStaticMarkup(React.createElement(Education, { education: [], certifications: [] }));
    assert.match(empty, /No education details listed yet/);
    assert.match(empty, /No certifications listed yet/);
    assert.doesNotMatch(empty, /<details|<select|<a\b/);
    const invalidLink = renderToStaticMarkup(React.createElement(Education, {
      education: [], certifications: [{ id: 'test-invalid', title: 'Test certificate', credentialUrl: 'javascript:alert(1)' }],
    }));
    assert.doesNotMatch(invalidLink, /<a\b|javascript:/);
  } finally { await server.close(); }
});
