import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { isProfileComplete } from "@/lib/utils";

const publicRoutes = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/apply-business",
  "/privacy-policy",
  "/data-deletion",
  "/terms-of-service",
  "/about",
  "/faq",
  "/points-levels",
  "/advertise",
  "/",
  "/questions",
  "/posts/:id",
  "/polls",
  "/polls/:id",
  "/groups/:groupId/posts/:id",
  "/groups/:groupId/polls/:id",
];

const ProtectedRoute = () => {
  const { user, isAuthenticated, isLoading, checkAuthUser } = useUserContext();
  const { openAuthModal, isOpen } = useAuthModal();
  const { pathname } = useLocation();

  useEffect(() => {
    const checkRouteAndAuth = async () => {
      if (isLoading) {
        return;
      }

      // Check if the current route is public
      const isPublicRoute = publicRoutes.some((route) => {
        if (route.includes(":id") || route.includes(":groupId")) {
          const regexPattern = route
            .replace(/:groupId/g, "[^/]+")
            .replace(/:id/g, "[^/]+");
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(pathname);
        }
        return route === pathname;
      });

      // If the route is public, do nothing (no modal or redirect)
      if (isPublicRoute) {
        return;
      }

      // Check authentication status for protected routes
      const isAuth = await checkAuthUser();
      if (!isAuth && !isOpen) {
        console.log(`[ProtectedRoute] User not authenticated, opening signin modal for protected route: ${pathname}`);
        openAuthModal("signin");
      } else if (!isAuth && isOpen) {
        console.log(`[ProtectedRoute] User not authenticated, modal already open for route: ${pathname}`);
      } else {
        console.log(`[ProtectedRoute] User authenticated, accessing protected route: ${pathname}`);
      }
    };

    checkRouteAndAuth();
  }, [pathname, isLoading, isAuthenticated, checkAuthUser, openAuthModal, isOpen]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-2">
        <img
          src="/assets/icons/loader.svg"
          alt="loader"
          width={24}
          height={24}
          className="animate-spin"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Do not render Outlet for protected routes; modal handles UI
    return null;
  }

  if (!isProfileComplete(user)) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;