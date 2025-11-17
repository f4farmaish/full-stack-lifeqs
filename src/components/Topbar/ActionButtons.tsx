import { useSearchContext } from "@/context/SearchContext";
import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ActionButtonsProps {
  pathname: string;
  isInGroup: boolean;
  isViewGroupsPage: boolean;
  isMyGroupsPage: boolean;
  groupId?: string;
  isAuthorized?: boolean; // Add new prop to check membership status
}

const ActionButtons = ({
  pathname,
  isInGroup,
  isViewGroupsPage,
  isMyGroupsPage,
  groupId,
  isAuthorized, // Add new prop
}: ActionButtonsProps) => {
  const { t } = useTranslation();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const {
    searchValue,
    setSearchValue,
    searchContext,
    setSearchContext,
    setCurrentGroupId,
  } = useSearchContext();
  const navigate = useNavigate();

  // Set search context and group ID based on page context
  useEffect(() => {
    if (isInGroup && groupId) {
      setCurrentGroupId(groupId);
      setSearchContext("groupPosts");
    } else {
      setCurrentGroupId(null);
      if (searchValue.startsWith("@")) {
        setSearchContext("user");
      } else if (pathname === "/polls") {
        setSearchContext("polls");
      } else {
        setSearchContext("posts");
      }
    }
  }, [
    isInGroup,
    groupId,
    setCurrentGroupId,
    setSearchContext,
    searchValue,
    pathname,
  ]);

  // Toggle search input visibility
  const handleSearchToggle = () => {
    setIsSearchVisible((prev) => {
      const newState = !prev;
      if (newState) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else {
        setSearchValue("");
      }
      return newState;
    });
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (!searchValue.trim()) return;

    if (!isInGroup && searchValue.startsWith("@")) {
      const username = searchValue.slice(1).trim();
      if (username) {
        setSearchContext("user");
        navigate("/", { state: { search: username, type: "user" } });
        return;
      }
    }

    if (searchContext === "user" || pathname === "/all-users") {
      navigate("/all-users", { state: { search: searchValue, type: "user" } });
      return;
    }

    switch (searchContext) {
      case "posts":
        navigate("/", { state: { search: searchValue, type: "posts" } });
        break;
      case "polls":
        navigate("/polls", { state: { search: searchValue, type: "polls" } });
        break;
      case "groups":
      case "myGroups":
        navigate("/groups", { state: { search: searchValue } });
        break;
      case "groupPosts":
        navigate(location.pathname, { state: { search: searchValue } });
        break;
      default:
        console.warn("Unknown search context:", searchContext);
    }
  };

  // Close search input when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(target) &&
        target.id !== "searchButton"
      ) {
        setIsSearchVisible(false);
        setSearchValue("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setSearchValue]);

  // Handle input change and reset states when cleared
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (!newValue.trim()) {
      setSearchContext("posts");
      setCurrentGroupId(null);
    }
  };

  // Handle Enter key to submit search and hide cursor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
      searchInputRef.current?.blur();
    }
  };

  return (
    <ul className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
      {/* Search Button */}
      <li className="leftsidebar-link group relative">
        <button
          id="searchButton"
          onClick={handleSearchToggle}
          className="flex items-center gap-2 p-4 group-hover:text-white">
          <img
            src="/assets/icons/search.svg"
            alt={t('common.search')}
            className="h-7 w-7 group-hover:filter group-hover:brightness-0 group-hover:invert"
          />
          {t('common.search')}
        </button>
        {isSearchVisible && (
          <div
            className="absolute top-full left-0 mt-4 bg-dark-3 rounded-md shadow-lg p-2 z-50"
            style={{
              minWidth: "300px",
              position: "fixed",
              top: "60px",
              left: "50%",
              transform: "translateX(-50%)",
            }}
            role="search"
            aria-label="Search Posts">
            <input
              ref={searchInputRef}
              type="text"
              aria-label={t('search.searchPosts')}
              placeholder={t('search.placeholder')}
              value={searchValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-full h-14 px-3 py-2 rounded-md border border-dark-4 bg-dark-4 text-light-1 text-sm resize-none focus:outline-none placeholder:text-light-4"
            />
          </div>
        )}
      </li>

      {/* Conditional Rendering for Buttons */}
      {isViewGroupsPage || isMyGroupsPage || (isInGroup && !isAuthorized) ? (
        <>
          {/* My Groups Button */}
          <li className="leftsidebar-link group">
            <NavLink
              to="/my-groups"
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-lg text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition transform duration-300 ease-in-out ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 border-2 border-white"
                    : "bg-gradient-to-r from-purple-500 to-pink-400"
                }`
              }
              style={{
                boxShadow: "0 0 15px rgba(255, 105, 180, 0.7)",
              }}>
              <img
                src="/assets/icons/groups_topbar.svg"
                alt={t('common.myGroups')}
                className="h-6 w-6 group-hover:filter group-hover:brightness-0 group-hover:invert"
              />
              <span>{t('common.myGroups')}</span>
            </NavLink>
          </li>

          {/* Create a Group Button */}
          <li className="leftsidebar-link group">
            <NavLink
              to="/groups/create"
              className={({ isActive }) =>
                `flex items-center gap-4 px-6 py-3 rounded-lg text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition transform duration-300 ease-in-out ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 border-2 border-white"
                    : "bg-gradient-to-r from-blue-400 to-purple-500"
                }`
              }
              style={{
                boxShadow: "0 0 15px rgba(138, 43, 226, 0.7)",
              }}>
              <img
                src="/assets/icons/poll-add.svg"
                alt={t('common.createGroup')}
                className="h-6 w-6 group-hover:filter group-hover:brightness-0 group-hover:invert"
              />
              <span>{t('common.createGroup')}</span>
            </NavLink>
          </li>
        </>
      ) : (
        <>
          {/* Ask Button */}
          <li className="leftsidebar-link group">
            <NavLink
              to={
                isInGroup
                  ? `/groups/${groupId}/create-post-group`
                  : "/create-post"
              }
              className="flex items-center gap-4 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition transform duration-300 ease-in-out"
              style={{ boxShadow: "0 0 15px rgba(255, 105, 180, 0.7)" }}>
              <img
                src="/assets/icons/gallery-add.svg"
                alt={t('common.ask')}
                className="h-6 w-6 group-hover:filter group-hover:brightness-0 group-hover:invert"
              />
              <span>{t('common.ask')}</span>
            </NavLink>
          </li>

          {/* + Poll Button */}
          <li className="leftsidebar-link group">
            <NavLink
              to={
                isInGroup ? `/groups/${groupId}/create-poll` : "/polls/create"
              }
              className="flex items-center gap-4 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-300 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition transform duration-300 ease-in-out"
              style={{ boxShadow: "0 0 15px rgba(0, 120, 255, 0.7)" }}>
              <img
                src="/assets/icons/poll-add.svg"
                alt={t('common.poll')}
                className="h-6 w-6 group-hover:filter group-hover:brightness-0 group-hover:invert"
              />
              <span>{t('common.poll')}</span>
            </NavLink>
          </li>
        </>
      )}
    </ul>
  );
};

export default ActionButtons;