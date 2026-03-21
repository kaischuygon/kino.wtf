import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/terms')({
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  return (
    <section className="p-3 flex flex-col gap-4 max-w-3xl">
      <h1 className="text-2xl font-display">Terms of Service</h1>
      <p className="text-sm text-base-content/70">Last updated: March 21, 2026</p>

      <p>
        By accessing or using kino.wtf, you agree to these terms. If you do not agree, do not use
        the service.
      </p>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Use of the service</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>You may use kino.wtf for personal, non-commercial entertainment.</li>
          <li>You agree not to abuse, disrupt, or attempt to compromise the service.</li>
          <li>You are responsible for activity performed through your account.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Accounts and authentication</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>You may play without an account, or sign in for synced progress and stats.</li>
          <li>OAuth and authentication are provided through third-party services.</li>
          <li>We may suspend access for misuse, fraud, or abuse.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Content and availability</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>Game content and features may change at any time without notice.</li>
          <li>The service is provided on an "as is" and "as available" basis.</li>
          <li>We do not guarantee uninterrupted availability or error-free operation.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, kino.wtf and its operators are not liable for
          indirect, incidental, special, consequential, or punitive damages arising from your use of
          the service.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          For terms questions, contact{' '}
          <a className="link link-primary" href="mailto:info@kino.wtf">
            info@kino.wtf
          </a>
          .
        </p>
      </div>
    </section>
  );
}
