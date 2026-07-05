/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, GitCommit, Clock, Scale } from 'lucide-react';

declare global {
  const __GIT_BRANCH__: string;
  const __GIT_COMMIT__: string;
  const __REPO_URL__: string;
  const __BUILD_TIMESTAMP__: string;
}

export function BuildInfo() {
  const branch = __GIT_BRANCH__;
  const commit = __GIT_COMMIT__;
  const repoUrl = __REPO_URL__;
  const commitUrl = `${repoUrl}/commit/${commit === 'unknown' ? '' : commit}`;
  const buildTime = new Date(__BUILD_TIMESTAMP__).toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <footer className="mt-auto border-t border-[#E5E7EB] bg-white px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#9CA3AF]">
        <div className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-[#6B7280] transition">
            Privacy Policy
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {buildTime}
          </span>
        <a
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-[#6B7280] transition"
        >
          <GitBranch size={12} />
          {branch}
        </a>
        <a
          href={commitUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-[#6B7280] transition font-mono"
        >
          <GitCommit size={12} />
          {commit}
        </a>
        <a
          href="https://www.apache.org/licenses/LICENSE-2.0.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-[#6B7280] transition"
        >
          <Scale size={12} />
          Apache-2.0
        </a>
        </div>
      </div>
    </footer>
  );
}
