import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import Sidebar from "./Sidebar";

// Function to extract the settings option from the current path
const getOptionFromPath = (path: string) => {
  if (path.startsWith("/settings/")) {
    return path.split("/")[2];
  }
  return null;
};

const Settings = () => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Update selectedOption based on the current path
  useEffect(() => {
    setSelectedOption(getOptionFromPath(location.pathname));
  }, [location.pathname]);

  // Automatically navigate to Update Profile when accessing /settings
  useEffect(() => {
    if (location.pathname === "/settings") {
      navigate("/settings/update-profile");
    }
  }, [location.pathname, navigate]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const showSidebar = !selectedOption || !isMobile;
  const showContent = !!selectedOption;

  return (
    <div className="flex flex-col sm:flex-row w-full bg-dark-3 overflow-hidden h-[100dvh] sm:h-auto rounded-lg ">
      {/* Mobile / Desktop: Show sidebar only when no option is selected (mobile) or always (desktop) */}
      {showSidebar && (
        <div className="w-full sm:max-w-sm border-b sm:border-b-0 sm:border-r border-dark-4 h-[50vh] sm:h-full overflow-y-auto custom-scrollbar">
          <Sidebar
            onSelectOption={setSelectedOption}
            selectedOption={selectedOption}
          />
        </div>
      )}

      {/* Content area */}
      {showContent && (
        <div className="flex-1 h-full flex flex-col">
          {/* Back button for mobile only */}
          <div className="sm:hidden px-4 py-2 border-b border-dark-4 bg-dark-3">
            <Button
              onClick={() => {
                setSelectedOption(null);
              }}
              variant="ghost"
              className="shad-button_ghost back-button">
              <img
                src="/assets/icons/back.svg"
                alt="back"
                width={24}
                height={24}
              />
              <p className="small-medium lg:base-medium">Back</p>
            </Button>
          </div>

          <div className="flex-1 h-full">
            <Outlet />
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;