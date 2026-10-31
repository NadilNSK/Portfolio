import { useEffect, useRef, useState } from 'react';
import { CONTACT_EMAIL, sendContactMessage } from '../lib/contact';

export default function Contact() {
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (requestRef.current) return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (!fields.name.trim() || !fields.message.trim()) {
      setStatus({ type: 'error', message: 'Please enter your name and message.' });
      return;
    }
    const request = new AbortController();
    requestRef.current = request;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 20000);
    setStatus({ type: 'sending', message: 'Sending your message…' });
    try {
      await sendContactMessage(fields, { signal: request.signal });
      if (request.signal.aborted) return;
      form.reset();
      setStatus({ type: 'success', message: 'Your message was submitted successfully. Thank you for getting in touch!' });
    } catch (error) {
      if (request.signal.aborted && !timedOut) return;
      setStatus({
        type: 'error',
        message: timedOut
          ? 'The request timed out, so delivery could not be confirmed. Please email me directly.'
          : error instanceof TypeError
            ? 'Unable to connect. Please check your connection or email me directly.'
            : error.message || 'Your message could not be submitted. Please try again later.',
      });
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === request) requestRef.current = null;
    }
  };

  return (
    <section className="contact" id="contact">
      <h2 className="heading">Contact <span>Me</span></h2>

      <form onSubmit={handleSubmit} aria-busy={status.type === 'sending'}>
        <div className="input-box">
          <input type="text" name="name" placeholder="Full Name" aria-label="Full Name" autoComplete="name" maxLength="120" required />
          <input type="email" name="email" placeholder="Email Address" aria-label="Email Address" autoComplete="email" maxLength="254" required />
        </div>
        <div className="input-box">
          <input type="tel" name="phone" placeholder="Mobile Number" aria-label="Mobile Number" autoComplete="tel" maxLength="40" />
          <input type="text" name="subject" placeholder="Email Subject" aria-label="Email Subject" maxLength="200" />
        </div>
        <input className="contact-honeypot" type="text" name="_honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <textarea name="message" cols="30" rows="8" placeholder="Your Message" aria-label="Your Message" maxLength="10000" required></textarea>
        <button type="submit" className="btn" disabled={status.type === 'sending'}>
          {status.type === 'sending' ? 'Sending…' : 'Send Message'}
        </button>
        <p className={`contact-status ${status.type}`} role="status" aria-live="polite" aria-atomic="true">
          {status.message}
          {status.type === 'error' && <> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}
        </p>
      </form>
    </section>
  );
}
