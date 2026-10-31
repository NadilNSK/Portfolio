export const CONTACT_EMAIL = 'nadilnandinuuni@gmail.com';
export const CONTACT_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

export async function sendContactMessage(fields, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(CONTACT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal,
    body: JSON.stringify({
      name: fields.name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      subject: fields.subject.trim(),
      message: fields.message.trim(),
      _subject: fields.subject.trim() || 'New message from your portfolio',
      _replyto: fields.email.trim(),
      _template: 'table',
      _honey: fields._honey || '',
    }),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('The message service returned an unexpected response. Please try again later.'); }
  if (!response.ok || (result?.success !== true && result?.success !== 'true')) {
    if (/activat|confirm.*email/i.test(result?.message || '')) {
      throw new Error('This contact form is awaiting email activation. Please email me directly for now.');
    }
    throw new Error('Your message could not be submitted. Please try again later or email me directly.');
  }
}
