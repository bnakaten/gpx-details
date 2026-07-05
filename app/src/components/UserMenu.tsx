/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';

export function UserMenu() {
  const { user, logout, deleteAccount } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="text-sm text-[#374151] font-medium">
          {user.firstname} {user.lastname}
        </span>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#EF4444] transition cursor-pointer"
          title="Delete account"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#EF4444] transition cursor-pointer"
          title="Logout"
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-[#374151] mb-2">Delete Account</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              This will permanently remove your account and all associated data from our servers.
              Your Strava connection will also be revoked. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-[#6B7280] bg-[#F3F4F6] rounded-md hover:bg-[#E5E7EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm text-white bg-[#EF4444] rounded-md hover:bg-[#DC2626] disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
