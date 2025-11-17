import { Outlet, useLocation } from "react-router-dom";
import Topbar from "@/components/shared/TopbarMobile";
import Bottombar from "@/components/shared/Bottombar";
import LeftSidebar from "@/components/Topbar/Topbar";
import InformativeBottomBar from "@/components/shared/InformativeBottomBar";
import { useScrollDetector } from "@/hooks/useScrollDetector";

const RootLayout = () => {
  const { pathname } = useLocation();
  
  // List of pages where the LeftSidebar should NOT be displayed
  const pagesWithoutSidebar = ["/groups/create", "/complete-profile"];

  // Dynamically check for "/groups/:groupId/create-post-group" or "/groups/:groupId/create-poll"
  const isExcludedPage =
    pagesWithoutSidebar.includes(pathname) ||
    /^\/update-post\/[^/]+$/.test(pathname);

  // Use enhanced scroll detector hook with scroll direction detection
  const { isVisible: showInformativeBar } = useScrollDetector({
    threshold: 2, // Fallback: show after 2 smaller scrolls
    scrollThreshold: 80, // Show immediately if scrolled past 80px from top
    hideOnScrollUp: true, // Enable hiding on scroll up
    hideScrollThreshold: 20, // Hide when scrolling up > 20px
  });

  return (
    <div className="w-full flex flex-col">
      {/* Left Sidebar should only render if not on excluded pages */}
      {!isExcludedPage && (
        <div className="sticky top-0 z-50">
          <LeftSidebar />
          {/* Minimal spacer to separate LeftSidebar from content */}
          <div className="-mt-10" />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Topbar />
        <section className="flex flex-1 h-full">
          <Outlet />
        </section>
        <Bottombar />
      </div>

      {/* Informative Bottom Bar - appears as overlay after scrolling */}
      <InformativeBottomBar isVisible={showInformativeBar} />
    </div>
  );
};

export default RootLayout;