/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import { Layout } from './components/Layout';
import HomePage from './pages/HomePage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
