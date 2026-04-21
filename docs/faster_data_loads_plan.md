# Goal Description

The objective is to fix the sluggish data-loading performance that occurs when navigating between screens in the MyPomo app. Currently, pages use Client Components (`'use client'`) and fetch data via `useEffect` hooks on mount, causing a "waterfall" network effect and layout shifts. 

We will migrate key pages to React Server Components (RSC). By fetching data natively on the server during the initial render, the browser will receive fully-populated UI instantly, resulting in zero loading lag.

## User Review Required

> [!WARNING]  
> This requires removing `'use client'` from the main page files and extracting any interactive UI elements (like `onClick` handlers or `useState`) into smaller, dedicated client components.

---

## Proposed Changes

### 1. Re-architect Categories Page 
Convert the main page into a Server Component. 

#### [MODIFY] [categories/page.js](file:///c:/Projects/MyPomo/src/app/categories/page.js)
- Remove the `'use client'` directive.
- Remove `useEffect` and `useState` for data fetching.
- Fetch categories directly within the component: `const categories = await getCategories()`.
- Pass the fetched data down to a new client component array/list.

#### [NEW] [categories/CategoryManager.js](file:///c:/Projects/MyPomo/src/app/categories/CategoryManager.js)
- *If interactivity is heavy:* Create a new `'use client'` component strictly for rendering the form, handling deletions, and state logic. This component will accept the `categories` array as a prop from the Server Component.

### 2. Re-architect Sessions Page
Eliminate the client-side fetch for focus sessions.

#### [MODIFY] [sessions/page.js](file:///c:/Projects/MyPomo/src/app/sessions/page.js)
- Remove `'use client'` and hook-based data fetches.
- Fetch data server-side: `const sessions = await getFocusSessions()`.
- Pass the sessions directly to the table rendering. (Unless row-level interactivity is needed, then extract a `SessionTable` client component).

### 3. Re-architect Analytics/Dashboard Page
Ensure complex data aggregation runs on the server.

#### [MODIFY] [analytics/page.js](file:///c:/Projects/MyPomo/src/app/analytics/page.js)
- Convert to a Server Component.
- Perform all chart data preparations on the server (e.g., getting last 7 days of sessions) so the browser doesn't have to execute JS math.
- ONLY leave `'use client'` on the specific `<Chart />` component wrapper that requires a charting library.

---

## Open Questions

> [!NOTE]  
> Data staleness: Server Components cache aggressively in Next.js. We need to ensure we call `revalidatePath('/categories')` inside our Server Actions whenever a user creates, edits, or deletes a category or session, so the Server Component instantly updates its cache. 

## Verification Plan

### 1. Performance Measurement (Before & After)
Before implementing these changes, record the current baseline load times:
1. Open Google Chrome DevTools and navigate to the **Network** tab.
2. Enable **Network Throttling** (e.g., set to 'Fast 3G') and check 'Disable cache' to simulate a realistic network delay.
3. Click a navigation link (e.g., going to `/categories`) and measure the time it takes from clicking the link to the actual categories populating on the screen.
4. **Document the Baseline Time.**

After implementing the Server Component migration, run the exact same test:
1. Under the same network throttling conditions, click to navigate to `/categories`.
2. **Document the New Load Time.**
3. Verify that the data load is effectively instant upon navigation and the intermediate "empty/skeleton" state natively disappears. Calculate the percentage reduction in load time.

### 2. Automated Tests
- **Build Logs:** Ensure Next.js build logs show the pages are correctly compiled as Server/Static Components (usually identified by a `λ` or `○` symbol in the Next.js terminal output) and that there are no `use client` boundary warnings.

### 3. Manual Verification
1. **Network Payload:** Open the browser's developer tools. Navigate to the `/categories` and `/sessions` tabs. Verify that no client-side `fetch` or `POST` requests are being fired to retrieve initial data—it must come baked into the initial HTML payload.
2. **Data Mutation Check:** Create a new category or delete an existing session. Ensure that the page updates instantly reflecting the new data (confirming Next.js `revalidatePath` functions as intended to clear the server cache).
