import * as z from "zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { AppwriteException } from "appwrite";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import { useToast } from "@/components/ui/use-toast";

import { SigninValidation } from "@/lib/validation";
import {
  useSignInAccount,
  useSignInWithGoogle,
  useSignInWithFacebook,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  awardLoginPoints,
  updateLastLoginDate,
  updateUserLevelAndPoints,
  penalizeForNoLoginDays,
  isTodaySpecial,
  awardBirthdayBonus,
} from "@/services/userService";
import { handleOAuthLogin } from "@/services/authService";
import { UserAction } from "@/lib/pointsMapping";
import { useQueryClient } from "@tanstack/react-query";

// Import SVG icons
import GoogleIcon from "/assets/icons/google.svg";
import FacebookIcon from "/assets/icons/facebook.svg";

interface SigninFormProps {
  isModal?: boolean;
}

const SigninForm = ({ isModal = false }: SigninFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { closeAuthModal, openAuthModal } = useAuthModal();
  const {
    user,
    checkAuthUser,
    isLoading: isUserLoading,
    isAuthenticated,
  } = useUserContext();
  const isMounted = useRef(false);
  const [isCheckingOAuth, setIsCheckingOAuth] = useState(false);

  // Queries
  const { mutateAsync: signInAccount, isLoading } = useSignInAccount();
  const { mutateAsync: signInWithGoogle, isLoading: isGoogleLoading } =
    useSignInWithGoogle();
  const { mutateAsync: signInWithFacebook, isLoading: isFacebookLoading } =
    useSignInWithFacebook();

  const form = useForm<z.infer<typeof SigninValidation>>({
    resolver: zodResolver(SigninValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle email/password sign-in
  const handleSignin = async (user: z.infer<typeof SigninValidation>) => {
    try {
      const session = await signInAccount(user);
      if (!session || !session.userId) {
        console.error("Session creation failed for email:", user.email);
        toast({ title: "Login failed. Please try again." });
        return;
      }

      // Wait to ensure session stability
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Force refetch of currentUser query
      await queryClient.refetchQueries({
        queryKey: ["currentUser"],
        exact: true,
      });

      const isLoggedIn = await checkAuthUser();

      if (isLoggedIn) {
        const oldLoginDate = await updateLastLoginDate(session.userId);
        const today = new Date().toDateString();

        if (!(oldLoginDate && oldLoginDate === today)) {
          const updatedUser = await updateUserLevelAndPoints(
            session.userId,
            UserAction.LOGIN_PER_DAY
          );
          if (updatedUser) {
            toast({
              description: "Thanks for logging in today. You've earned +5 points",
              width: "full",
            });
          }
          if (isTodaySpecial()) {
            await updateUserLevelAndPoints(
              session.userId,
              UserAction.SPECIAL_DAY_LOGIN
            );
          }

          if (oldLoginDate) {
            const penalizedUser = await penalizeForNoLoginDays(
              session.userId,
              oldLoginDate
            );
            if (penalizedUser) {
              const diffInDays = Math.floor(
                (new Date().getTime() - new Date(oldLoginDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              toast({
                description: `You lost ${diffInDays} points for missing ${diffInDays} day(s) of login.`,
              });
            }
          }
        }

        const awardBirthday = await awardBirthdayBonus(session.userId);
        if (awardBirthday) {
          toast({
            description: "Happy Birthday! You've earned +30 points.",
            width: "full",
          });
        }

        form.reset();
        if (isModal) {
          closeAuthModal();
        } else {
          navigate("/");
        }
      } else {
        console.error("Authentication check failed for email:", user.email);
        toast({ title: "Login failed. Please try again." });
      }
    } catch (error: any) {
      console.error("Login error:", {
        message: error.message,
        code: error.code,
        error: error,
      });
      let errorMessage =
        "Login failed. Please check your credentials and try again.";
      if (error.code === "ACCOUNT_DELETED") {
        errorMessage = "Your account has been deleted.";
      } else if (error instanceof AppwriteException) {
        if (error.message.includes("Invalid credentials")) {
          errorMessage = "Incorrect email or password. Please try again.";
        } else if (error.message.includes("Email not verified")) {
          errorMessage =
            "Please verify your email. Check your inbox or spam folder.";
        } else if (error.code === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        } else if (error.code === 403) {
          errorMessage =
            "Access forbidden. Please ensure your account is authorized.";
        } else if (error.code === 401) {
          errorMessage = "Unauthorized. Please check your credentials.";
        }
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle OAuth sign-in (Google or Facebook)
  const handleOAuthSignIn = async (provider: "google" | "facebook") => {
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else {
        await signInWithFacebook();
      }

      // Wait to ensure session stability
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Force refetch of currentUser query
      await queryClient.refetchQueries({
        queryKey: ["currentUser"],
        exact: true,
      });

      const isLoggedIn = await checkAuthUser();

      if (isLoggedIn) {
        if (isModal) {
          closeAuthModal();
        } else {
          navigate("/");
        }
      } else {
        console.error(`OAuth ${provider} authentication verification failed`);
        toast({
          title: "Sign-in Failed",
          description: "Authentication failed. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(`Error in OAuth ${provider} sign-in:`, {
        message: error.message,
        code: error.code,
        type: error.type,
      });
      let errorMessage = `Failed to sign in with ${
        provider.charAt(0).toUpperCase() + provider.slice(1)
      }. Please try again.`;
      if (error.type === "project_invalid_success_url") {
        errorMessage = `Invalid OAuth success URL. Ensure ${window.location.origin}/sign-in is added to Appwrite's OAuth redirect URLs.`;
      } else if (error.type === "general_argument_invalid") {
        errorMessage = "Invalid OAuth configuration. Contact support.";
      } else if (error.message.includes("redirect_uri_mismatch")) {
        errorMessage = `Invalid redirect URI. Ensure ${window.location.origin}/sign-in is added to the OAuth redirect URLs in Facebook for Developers.`;
      } else if (error.message.includes("access_denied")) {
        errorMessage = "Access denied by provider. Please try again.";
      } else if (error.code === 401) {
        errorMessage = "Unauthorized. Ensure your account is authorized.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Check OAuth login on mount
  useEffect(() => {
    if (isMounted.current || isAuthenticated || isCheckingOAuth) return;
    isMounted.current = true;

    const initOAuth = async () => {
      setIsCheckingOAuth(true);
      try {
        const oauthSuccess = await handleOAuthLogin();
        if (oauthSuccess) {
          await queryClient.refetchQueries({
            queryKey: ["currentUser"],
            exact: true,
          });
          const isLoggedIn = await checkAuthUser();
          if (isLoggedIn && user.id) {
            const pointsAwarded = await awardLoginPoints(user.id);
            if (pointsAwarded) {
              toast({
                description:
                  "Logged in successfully with Google. You've earned +5 points",
              });
            }
            if (isModal) {
              closeAuthModal();
            } else {
              navigate("/");
            }
          }
        }
      } catch (error: any) {
        console.error("Error during OAuth initialization:", {
          message: error.message,
          code: error.code,
        });
      } finally {
        setIsCheckingOAuth(false);
      }
    };
    initOAuth();

    return () => {
      isMounted.current = false;
    };
  }, [checkAuthUser, navigate, toast, isAuthenticated, queryClient, user.id, isModal, closeAuthModal]);

  return (
    <Form {...form}>
      <div className="sm:w-420 flex-center flex-col">
        <img
          src="/assets/images/lifeqss.png"
          alt="logo"
          width="200"
          height="50"
        />

        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">
          Log in to your account
        </h2>
        <p className="text-light-3 small-medium md:base-regular mt-2">
          Welcome back! Log in with your email or use Google/Facebook.
        </p>
        <form
          onSubmit={form.handleSubmit(handleSignin)}
          className="flex flex-col gap-5 w-full mt-4"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Email</FormLabel>
                <FormControl>
                  <Input type="email" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">Password</FormLabel>
                <FormControl>
                  <Input type="password" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="shad-button_primary">
            {isLoading || isUserLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Loading...
              </div>
            ) : (
              "Log in"
            )}
          </Button>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={isGoogleLoading || isUserLoading}
              className="w-full px-6 py-3 bg-white text-gray-700 font-medium text-base rounded-lg shadow-md hover:bg-gray-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 border border-gray-300 flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <div className="flex-center gap-2">
                  <Loader /> Signing in...
                </div>
              ) : (
                <>
                  <img src={GoogleIcon} alt="Google Icon" className="w-5 h-5" />
                  Sign in with Google
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => handleOAuthSignIn("facebook")}
              disabled={isFacebookLoading || isUserLoading}
              className="w-full px-6 py-3 bg-blue-400 text-white font-medium text-base rounded-lg shadow-md hover:bg-blue-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isFacebookLoading ? (
                <div className="flex-center gap-2">
                  <Loader /> Signing in...
                </div>
              ) : (
                <>
                  <img
                    src={FacebookIcon}
                    alt="Facebook Icon"
                    className="w-6 h-6"
                  />
                  Sign in with Facebook
                </>
              )}
            </Button>
          </div>

          <p className="text-small-regular text-light-2 text-center mt-2">
            Don't have an account?{" "}
            <button
              onClick={() => openAuthModal("signup")}
              className="text-primary-500 text-small-semibold ml-1"
            >
              Sign up
            </button>
          </p>
          <p className="text-small-regular text-light-2 text-center">
            Forgot your password?{" "}
            <button
              onClick={() => openAuthModal("forgot-password")}
              className="text-primary-500 text-small-semibold ml-1"
            >
              Reset it
            </button>
          </p>
          <p className="text-small-regular text-light-2 text-center">
            <button
              onClick={() => openAuthModal("business")}
              className="text-primary-500 text-small-semibold"
            >
              Create a business account – Apply
            </button>
          </p>
        </form>
      </div>
    </Form>
  );
};

export default SigninForm;