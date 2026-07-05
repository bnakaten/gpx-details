/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';

export function PrivacyPolicy() {
  return (
    <article className="prose prose-sm max-w-3xl mx-auto py-8 text-[#374151]">
      <h1 className="text-xl font-bold text-[#111827] mb-6">Privacy Policy</h1>

      <p className="text-xs text-[#6B7280] mb-6">
        Last updated: June 2026
      </p>

      <section className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">1. General Information</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            The protection of your personal data is important to us. This privacy policy informs you
            about the nature, scope and purpose of the processing of personal data in connection with
            the use of this web application. The controller within the meaning of the General Data
            Protection Regulation (GDPR) and other national data protection laws             is the operator named
            below.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">2. Provision of the Web Application</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            Each time this web application is accessed, information is automatically collected by the web
            server (so-called server logs). These include the IP address, date and time of access, requested
            URL, user agent (browser identification) and, if applicable, the referrer URL. This data is
            technically necessary to deliver the application and ensure server security. The legal basis is
            Art. 6(1)(f) GDPR (legitimate interest). Server logs are deleted regularly.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">3. Processing of GPX Data</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            Uploaded GPX files are processed exclusively for the purpose of standstill analysis on the
            server side. The analysis takes place in the server's working memory. <strong>No permanent
            storage</strong> of GPX files takes place on the server. Once the analysis is complete, the
            data is immediately discarded. Processing is based on Art. 6(1)(b) GDPR (performance of a
            contract).
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">4. Strava Integration</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            You have the option to connect your Strava account with this application. The connection is
            established via Strava's OAuth2 protocol. The following data is processed by Strava and stored
            in this application:
          </p>
          <ul className="text-xs leading-relaxed text-[#6B7280] list-disc pl-5 mt-1 space-y-1">
            <li>Your Strava athlete ID (for identifying your account)</li>
            <li>Your first and last name (for display in the application)</li>
            <li>Strava access token (to authorize access to your activities)</li>
            <li>Strava refresh token (to renew the access token)</li>
          </ul>
          <p className="text-xs leading-relaxed text-[#6B7280] mt-1">
            This data is stored exclusively in a local SQLite database on the server. No data is passed on
            to third parties. The legal basis is your consent according to Art. 6(1)(a) GDPR, which you
            grant by connecting with Strava. You can revoke the connection at any time via your Strava
            settings at <a href="https://www.strava.com/settings/apps" target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline">strava.com/settings/apps</a>.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">5. Cookies and Session Data</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            The application uses a session cookie for authentication. This cookie is technically necessary
            to recognize you after login and to provide the application's functionality. The cookie is an
            HttpOnly cookie and is not used for tracking purposes. After the session expires or after you
            log out, the cookie becomes invalid. The legal basis is Art. 6(1)(f) GDPR (legitimate interest
            in providing the application functions). No tracking cookies, analytics tools or similar
            technologies are used.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">6. Hosting</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            This application is hosted on <a href="https://render.com" target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline">Render</a>.
            Render is a cloud hosting provider with servers in the EU (Frankfurt). A data processing
            agreement pursuant to Art. 28 GDPR is in place with Render. Further information on data
            protection at Render can be found at <a href="https://render.com/privacy" target="_blank" rel="noreferrer" className="text-[#2563EB] hover:underline">render.com/privacy</a>.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">7. Your Rights</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            You have the following rights at any time:
          </p>
          <ul className="text-xs leading-relaxed text-[#6B7280] list-disc pl-5 mt-1 space-y-1">
            <li><strong>Access</strong> to your stored personal data (Art. 15 GDPR)</li>
            <li><strong>Rectification</strong> of inaccurate data (Art. 16 GDPR)</li>
            <li><strong>Erasure</strong> of your data (Art. 17 GDPR)</li>
            <li><strong>Restriction of processing</strong> (Art. 18 GDPR)</li>
            <li><strong>Data portability</strong> (Art. 20 GDPR)</li>
            <li><strong>Objection</strong> to processing (Art. 21 GDPR)</li>
          </ul>
          <p className="text-xs leading-relaxed text-[#6B7280] mt-1">
            To exercise your rights, please contact the address provided below. You also
            have the right to lodge a complaint with a supervisory authority (Art. 77 GDPR).
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">8. Disclosure to Third Parties</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            Your personal data will not be transferred to third parties for purposes other than those
            stated. We only disclose your data to third parties if you have given your express consent
            (Art. 6(1)(a) GDPR), if disclosure is necessary for the fulfilment of contractual obligations
            (Art. 6(1)(b) GDPR), or if there is a legal obligation (Art. 6(1)(c) GDPR).
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-2">9. Changes</h2>
          <p className="text-xs leading-relaxed text-[#6B7280]">
            We reserve the right to adapt this privacy policy as necessary so that it always complies with
            current legal requirements or to implement changes to our services. The new privacy policy will
            apply to your next visit.
          </p>
        </div>
      </section>
    </article>
  );
}
