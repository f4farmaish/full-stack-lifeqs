import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INITIAL_USER, useUserContext } from "@/context/AuthContext";
import { useSignOutAccount } from "@/lib/react-query/queries";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { useGetUserNotifications } from "@/lib/react-query/queries";
import { useAuthModal } from "@/context/AuthModalContext";
import { AuthModalMode } from "@/types";
import NavigationLinks from "./NavigationLinks";
import ActionButtons from "./ActionButtons";
import UserProfileSection from "./UserProfileSection";
import NotificationModal from "../shared/NotificationModal";
import { useQuery } from "@tanstack/react-query";
import { getGroupById } from "@/services/groupService";

const Topbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, setIsAuthenticated, setUser, isLoading } = useUserContext();
  const { openAuthModal } = useAuthModal();
  const unreadMessagesCount = useUnreadMessagesCount(user?.id);
  const { groupId } = useParams();
  const isInGroup = !!groupId;
  const isViewGroupsPage = pathname === "/groups";
  const isMyGroupsPage = pathname === "/my-groups";

  // Fetch group data to determine membership status
  const { data: groupData } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroupById(groupId!),
    enabled: !!groupId && !!user.id,
  });

  // Determine if user is authorized (member or admin) for the group
  const isAuthorized = groupData?.memberIds?.includes(user.id) || groupData?.admins?.includes(user.id);

  // Notification state
  const { data: notifications } = useGetUserNotifications(user.id);
  const unreadNotificationsCount =
    notifications?.documents.filter((notification) => !notification.isRead)
      .length || 0;
  const [isNotificationModalOpen, setNotificationModalOpen] = useState(false);
  const toggleNotificationModal = () =>
    setNotificationModalOpen((prev) => !prev);

  // Sign out logic
  const { mutate: signOut, isSuccess, isError } = useSignOutAccount();
  useEffect(() => {
    if (isSuccess) {
      setIsAuthenticated(false);
      setUser(INITIAL_USER);
      navigate("/sign-in");
    }
  }, [isSuccess, navigate, setIsAuthenticated, setUser]);

  useEffect(() => {
    if (isError) {
      console.error("Error while signing out");
    }
  }, [isError]);

  // Auto-scroll to the top
  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <nav
      ref={sidebarRef}
      className="leftsidebar md:flex-row shadow-md md:py-1 w-full"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--background-2)",
        borderColor: "var(--background-4)",
      }}>
      <NavigationLinks pathname={pathname} />

      {/* Logo Section */}
      <div className="flex items-center justify-center md:mb-0 py-2">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/assets/images/lifeqss.png"
            alt="logo"
            width={180}
            height={100}
          />
        </Link>
      </div>

      <ActionButtons
        pathname={pathname}
        isInGroup={isInGroup}
        isViewGroupsPage={isViewGroupsPage}
        isMyGroupsPage={isMyGroupsPage}
        groupId={groupId}
        isAuthorized={isAuthorized}
      />

      {/* Conditional Rendering for Authenticated vs. Non-Authenticated Users */}
      {isLoading ? (
        <div className="flex items-center justify-center">
          <img
            src="/assets/icons/loader.svg"
            alt="loader"
            width={24}
            height={24}
            className="animate-spin"
          />
        </div>
      ) : user.id ? (
        <>
          <UserProfileSection
            user={user}
            isLoading={isLoading}
            unreadMessagesCount={unreadMessagesCount}
            unreadNotificationsCount={unreadNotificationsCount}
            signOut={signOut}
            toggleNotificationModal={toggleNotificationModal}
          />
          <NotificationModal
            isOpen={isNotificationModalOpen}
            onClose={() => setNotificationModalOpen(false)}
            userId={user.id}
          />
        </>
      ) : (
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              openAuthModal("signin");
            }}
            className="text-primary-500 hover:underline text-sm font-medium"
          >
            {t('common.signIn')}
          </button>
          <button
            onClick={() => {
              openAuthModal("signup");
            }}
            className="text-primary-500 hover:underline text-sm font-medium"
          >
            {t('common.signUp')}
          </button>
        </div>
      )}
    </nav>
  );
};

export default Topbar;