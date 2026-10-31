# Nadil Nandinu's portfolio

## Contact form

The Contact Me form submits to FormSubmit and delivers submissions to
`nadilnandinuuni@gmail.com`. The recipient is configured in `src/lib/contact.js`.
No Gmail password, app password, or API key belongs in the frontend.

### Activate email delivery

1. Open the website through `npm run dev` or its deployed HTTPS URL.
2. Submit a test message using Contact Me.
3. Open the FormSubmit confirmation email in `nadilnandinuuni@gmail.com` (check
   Spam too) and click **Activate Form**. This confirms the recipient address;
   delivery remains pending until activation is complete.
4. Submit another message from the deployed site and confirm it arrives. When
   deploying to a new URL, complete any confirmation FormSubmit requests there.

The form includes name, sender email, optional phone/subject, and message. Reply
to a notification to respond to the sender. Inputs are preserved when a request
fails; the success state is shown only after the service confirms acceptance.
An accepted request is not a guarantee of inbox placement. A direct email link
is available if a request fails or email activation is pending.

Form submissions are processed by FormSubmit. See its
[setup documentation](https://formsubmit.co/) and
[AJAX documentation](https://formsubmit.co/ajax-documentation).

## Development

Run `npm install`, then `npm run dev`. Use `npm run build` and `npm run lint` to
check the project; run `node --test tests/contact.test.mjs` for contact request
validation.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
