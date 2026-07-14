'use client';

import Sidebar from './Sidebar';

/**
 * AppShell wraps every page with the sidebar layout.
 * Mark as 'use client' so child pages can use hooks freely.
 */
export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
