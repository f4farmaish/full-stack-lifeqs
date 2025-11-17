import { useUserContext } from "@/context/AuthContext";
import { useLiveNotifications } from "@/hooks/useLiveNotifications";

const LiveNotificationConnector = () => {
  const { isAuthenticated, user } = useUserContext();

  // Only initialize WebSocket connection if the user is authenticated and has a valid ID
  useLiveNotifications(isAuthenticated ? user.id : null);

  return null; // No UI rendering
};

export default LiveNotificationConnector;
