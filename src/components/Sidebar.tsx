// Retired desktop sidebar (PEIC redesign Phase 2).
//
// The approved redesign replaces the 256px sidebar with the compact top
// navigation in components/shell/AppHeader.tsx. Everything the sidebar
// offered now lives there:
//   navigation tree  -> AppHeader's Indicators / Research / Tools menus (lib/appNav.ts)
//   GlobalSearch     -> AppHeader (inline from 1280px, search row below that)
//   SidebarAuthCard  -> AccountControl (header) and the mobile drawer footer
//   Settings modal   -> Tools › Settings
//   Free Subscription-> Tools › Free Subscription
//
// 45 page files render <Sidebar /> themselves inside their own flex layout,
// so this component is kept as a no-op rather than removed — their <main>
// (already flex-1) simply takes the full width. Those imports are removed
// page group by page group in the later migration phases, after which this
// file can be deleted. Not shipped in this phase: the sidebar's scroll-spy
// highlighting of /overview sections and the "PSX coming soon" teaser modal.
export default function Sidebar() {
  return null;
}
