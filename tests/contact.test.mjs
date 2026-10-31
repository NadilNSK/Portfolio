import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_EMAIL, CONTACT_ENDPOINT, sendContactMessage } from '../src/lib/contact.js';

const fields = Object.freeze({
  name: '  Portfolio Visitor  ',
  email: '  visitor@example.com  ',
  phone: '  +94 77 123 4567  ',
  subject: '  A project enquiry  ',
  message: '  Please contact me about a project.  ',
  _honey: '',
});
const reply = (success, { ok = true, message = 'Accepted' } = {}) => ({
  ok,
  json: async () => ({ success, message }),
});

test('posts every field to the intended recipient with reply-to and leaves input unchanged', async () => {
  const original = { ...fields };
  const controller = new AbortController();
  let calls = 0;
  await sendContactMessage(fields, {
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(CONTACT_EMAIL, 'nadilnandinuuni@gmail.com');
      assert.equal(CONTACT_ENDPOINT, `https://formsubmit.co/ajax/${CONTACT_EMAIL}`);
      assert.equal(url, CONTACT_ENDPOINT);
      assert.equal(options.method, 'POST');
      assert.deepEqual(options.headers, { 'Content-Type': 'application/json', Accept: 'application/json' });
      assert.equal(options.signal, controller.signal);
      assert.deepEqual(JSON.parse(options.body), {
        name: 'Portfolio Visitor',
        email: 'visitor@example.com',
        phone: '+94 77 123 4567',
        subject: 'A project enquiry',
        message: 'Please contact me about a project.',
        _subject: 'A project enquiry',
        _replyto: 'visitor@example.com',
        _template: 'table',
        _honey: '',
      });
      return reply(true);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(fields, original);
});

test('accepts only explicit boolean or string true and supplies a default subject', async t => {
  for (const success of [true, 'true']) {
    await t.test(`accepts ${JSON.stringify(success)}`, async () => {
      await assert.doesNotReject(sendContactMessage({ ...fields, subject: '   ' }, {
        fetchImpl: async (url, options) => {
          assert.equal(JSON.parse(options.body)._subject, 'New message from your portfolio');
          return reply(success);
        },
      }));
    });
  }
});

test('HTTP 200 service rejection and activation responses cannot become false success', async t => {
  for (const success of [false, 'false']) {
    await t.test(`rejects ${JSON.stringify(success)}`, async () => {
      await assert.rejects(sendContactMessage(fields, { fetchImpl: async () => reply(success) }), /could not be submitted/i);
    });
  }
  await t.test('activation gets an actionable direct-email error', async () => {
    await assert.rejects(sendContactMessage(fields, {
      fetchImpl: async () => reply('false', { message: "This form needs Activation. We've sent an email containing an Activate Form link." }),
    }), /awaiting email activation.*email me directly/i);
  });
});

test('bad HTTP, malformed JSON, and missing success fields are rejected', async t => {
  await t.test('non-2xx even with claimed success', async () => {
    await assert.rejects(sendContactMessage(fields, { fetchImpl: async () => reply(true, { ok: false }) }), /could not be submitted/i);
  });
  await t.test('invalid JSON is not accepted', async () => {
    await assert.rejects(sendContactMessage(fields, {
      fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError('Not JSON'); } }),
    }), /unexpected response/i);
  });
  for (const body of [{}, { message: 'OK' }, null, { success: 1 }, { success: 'TRUE' }]) {
    await t.test(`rejects unconfirmed payload ${JSON.stringify(body)}`, async () => {
      await assert.rejects(sendContactMessage(fields, {
        fetchImpl: async () => ({ ok: true, json: async () => body }),
      }), /could not be submitted/i);
    });
  }
});

test('network errors propagate unchanged and cancellation reaches injected fetch', async t => {
  await t.test('network failure is preserved for the UI error state', async () => {
    const failure = new TypeError('Network unavailable');
    await assert.rejects(sendContactMessage(fields, { fetchImpl: async () => { throw failure; } }), error => error === failure);
  });
  await t.test('abort signal cancels the pending request', async () => {
    const controller = new AbortController();
    let receivedSignal;
    const pending = sendContactMessage(fields, {
      signal: controller.signal,
      fetchImpl: (url, options) => new Promise((resolve, reject) => {
        receivedSignal = options.signal;
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }),
    });
    const rejection = assert.rejects(pending, error => error.name === 'AbortError');
    controller.abort();
    await rejection;
    assert.equal(receivedSignal, controller.signal);
  });
  assert.deepEqual(fields, {
    name: '  Portfolio Visitor  ', email: '  visitor@example.com  ', phone: '  +94 77 123 4567  ',
    subject: '  A project enquiry  ', message: '  Please contact me about a project.  ', _honey: '',
  });
});
