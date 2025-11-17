import {
  useContext,
  useLayoutEffect,
  useState,
  useRef,
  createContext,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/authService";
import { updateUserOnlineStatus } from "@/services/userService";
import LiveNotificationConnector from "@/hooks/LiveNotificationConnector";
import { appwriteConfig, databases } from "@/lib/appwrite/config";
import { INotificationPreferences } from "@/types";

export interface IUser {
  $id: string;
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  bio: string;
  lastQuestionReset: string;
  level: number;
  questionsAskedToday: number;
  highlightsToday?: number;
  point?: number;
  greatsToday?: number;
  lastGreatReset?: string;
  reactionsOnPostsToday?: number;
  postsToday?: number;
  relationshipStatus: string;
  occupation: string;
  educationLevel: string;
  dateOfBirth?: string;
  gender?: string;
  commentSortBy?: "date" | "likes";
  notificationPreferences?: INotificationPreferences;
  lastPostDate: string;
  tier: string;
  likesToday?: any;
  superLikesToday?: string;
  lastLikeReset?: string;
  simpleLikesToday?: string;
  isReaction?: boolean;
  expirationDateIsReaction?: string;
  firstName: string;
  lastName: string;
}

export const INITIAL_USER: IUser = {
  id: "",
  name: "",
  email: "",
  imageUrl: "",
  bio: "",
  lastQuestionReset: "",
  level: 0,
  questionsAskedToday: 0,
  highlightsToday: undefined,
  point: undefined,
  greatsToday: undefined,
  lastGreatReset: undefined,
  reactionsOnPostsToday: undefined,
  postsToday: 0,
  relationshipStatus: "",
  occupation: "",
  educationLevel: "",
  dateOfBirth: undefined,
  gender: undefined,
  commentSortBy: "likes",
  notificationPreferences: undefined,
  lastPostDate: "",
  tier: "",
  likesToday: undefined,
  superLikesToday: undefined,
  lastLikeReset: undefined,
  simpleLikesToday: undefined,
  isReaction: false,
  expirationDateIsReaction: "",
  firstName: "",
  lastName: "",
  $id: "",
};

type IContextType = {
  user: IUser;
  isLoading: boolean;
  setUser: React.Dispatch<React.SetStateAction<IUser>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  checkAuthUser: () => Promise<boolean>;
};

const INITIAL_STATE: IContextType = {
  user: INITIAL_USER,
  isLoading: true,
  isAuthenticated: false,
  setUser: () => {},
  setIsAuthenticated: () => {},
  checkAuthUser: async () => false,
};

const AuthContext = createContext<IContextType>(INITIAL_STATE);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [authState, setAuthState] = useState({
    user: INITIAL_USER,
    isLoading: true,
    isAuthenticated: false,
  });
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateOnlineStatusMutation = useMutation({
    mutationFn: ({ userId, isOnline }: { userId: string; isOnline: boolean }) =>
      updateUserOnlineStatus(userId, isOnline),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      console.error("[AuthProvider] Error updating online status:", error);
    },
  });

  const sendHeartbeatMutation = useMutation({
    mutationFn: (userId: string) =>
      databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userId,
        { lastActive: new Date().toISOString() }
      ),
    onSuccess: () => {},
    onError: (error) => {
      console.error("[AuthProvider] Error sending heartbeat:", error);
    },
  });

  const {
    data: currentUser,
    isLoading: isQueryLoading,
    error,
  } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 30 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  useLayoutEffect(() => {
    if (isQueryLoading) {
      setAuthState((prev) => ({ ...prev, isLoading: true }));
      return;
    }

    if (error && (error as any).code !== 401) {
      console.error("[AuthProvider] Authentication query failed:", {
        code: (error as any).code,
        message: (error as any).message,
        timestamp: new Date().toISOString(),
      });
    }

    if (currentUser) {
      const userData: IUser = {
        id: currentUser.$id,
        name: currentUser.name || "",
        level: currentUser.level || 0,
        email: currentUser.email || "",
        imageUrl: currentUser.imageUrl || "",
        bio: currentUser.bio || "",
        questionsAskedToday: currentUser.questionsAskedToday || 0,
        point: currentUser.point || 0,
        lastQuestionReset: currentUser.lastQuestionReset || "",
        lastGreatReset: currentUser.lastGreatReset || "",
        greatsToday: currentUser.greatsToday || 0,
        highlightsToday: undefined,
        reactionsOnPostsToday: undefined,
        postsToday: currentUser.postsToday,
        tier: currentUser.tier,
        lastPostDate: currentUser.lastPostDate,
        relationshipStatus: currentUser.relationshipStatus || "",
        occupation: currentUser.occupation || "",
        educationLevel: currentUser.educationLevel || "",
        dateOfBirth: currentUser.dateOfBirth || "",
        gender: currentUser.gender || undefined,
        commentSortBy: currentUser.commentSortBy || "likes",
        notificationPreferences: currentUser.notificationPreferences || [],
        isReaction: currentUser.isReaction,
        expirationDateIsReaction: currentUser.expirationDateIsReaction,
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        $id: "",
      };

      setAuthState({
        user: userData,
        isLoading: false,
        isAuthenticated: !currentUser.suspended,
      });

      try {
        updateOnlineStatusMutation.mutate({
          userId: userData.id,
          isOnline: true,
        });
      } catch (onlineError) {
        console.warn(
          "[AuthProvider] Failed to update online status:",
          onlineError
        );
      }
    } else {
      setAuthState({
        user: INITIAL_USER,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [currentUser, isQueryLoading, error]);

  useLayoutEffect(() => {
    if (!authState.isAuthenticated || !authState.user.id) return;

    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeatMutation.mutate(authState.user.id);
    }, 30 * 1000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (authState.user.id) {
        updateOnlineStatusMutation.mutate({
          userId: authState.user.id,
          isOnline: false,
        });
      }
    };
  }, [authState.isAuthenticated, authState.user.id]);

  useLayoutEffect(() => {
    if (!authState.isAuthenticated && authState.user.id) {
      queryClient.removeQueries({ queryKey: ["notifications"] });
      if (authState.user.id) {
        updateOnlineStatusMutation.mutate({
          userId: authState.user.id,
          isOnline: false,
        });
      }
    }
  }, [authState.isAuthenticated, authState.user.id, queryClient]);

  const checkAuthUser = async () => {
    try {
      await queryClient.refetchQueries({
        queryKey: ["currentUser"],
        exact: true,
      });
      const user = await getCurrentUser();
      if (user) {
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.code !== 401) {
        console.error("[AuthProvider] checkAuthUser error:", {
          message: error.message,
          code: error.code,
          timestamp: new Date().toISOString(),
        });
      }
      return false;
    }
  };

  const value: IContextType = {
    user: authState.user,
    isLoading: authState.isLoading,
    setUser: (value) =>
      setAuthState((prev) => ({
        ...prev,
        user: typeof value === "function" ? value(prev.user) : value,
      })),
    isAuthenticated: authState.isAuthenticated,
    setIsAuthenticated: (value) =>
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated:
          typeof value === "function" ? value(prev.isAuthenticated) : value,
      })),
    checkAuthUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {authState.isAuthenticated && authState.user.id && (
        <LiveNotificationConnector />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export const useUserContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUserContext must be used within an AuthProvider");
  }
  return context;
};
