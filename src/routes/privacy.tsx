import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <section className="p-3 flex flex-col gap-4 max-w-3xl">
      <h1 className="text-2xl font-display">Privacy Policy</h1>
      <p className="text-sm text-base-content/70">Last updated: March 21, 2026</p>

      <p>
        kino.wtf respects your privacy. This page explains what data is collected, how it is used,
        and what choices you have.
      </p>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">What we collect</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>Gameplay data such as guesses, results, and game progress.</li>
          <li>Account information when you sign in (such as email and provider identity).</li>
          <li>Profile preferences such as username and theme settings.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">How we use data</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>To run the game and save your progress.</li>
          <li>To sync your game history and stats when you are signed in.</li>
          <li>To improve reliability, security, and product quality.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Storage and providers</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>Local game progress can be stored in your browser local storage.</li>
          <li>Account-backed authentication and persistence are handled through Supabase.</li>
          <li>OAuth sign-in uses third-party providers such as Discord or Google.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Your choices</h2>
        <ul className="list-disc pl-6 flex flex-col gap-1">
          <li>You can play without creating an account.</li>
          <li>You can sign out at any time.</li>
          <li>You can request account deletion from the auth page when signed in.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          For privacy questions, contact{' '}
          <a className="link link-primary" href="mailto:info@kino.wtf">
            info@kino.wtf
          </a>
          .
        </p>
      </div>
    </section>
  );
}
