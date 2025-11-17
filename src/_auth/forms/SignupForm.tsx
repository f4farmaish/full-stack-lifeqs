import * as z from "zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useMemo } from "react";
import { debounce } from "lodash";

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

import {
  useCreateUserAccount,
  useResendVerificationEmail,
  useUpdateUserEmail,
  useSignInWithGoogle,
  useSignInWithFacebook,
  useCheckNicknameAvailability,
} from "@/lib/react-query/queries";
import { SignupValidation } from "@/lib/validation";
import { updateUserLevelAndPoints } from "@/services/userService";
import { UserAction } from "@/lib/pointsMapping";
import { useUserContext } from "@/context/AuthContext";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  relationshipStatusOptions,
  occupationOptions,
  educationLevelOptions,
} from "@/constants/demographicOptions";

// Import SVG icons
import GoogleIcon from "/assets/icons/google.svg";
import FacebookIcon from "/assets/icons/facebook.svg";

interface SignupFormProps {
  isModal?: boolean;
}

const SignupForm = ({ isModal = false }: SignupFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { checkAuthUser, user } = useUserContext();
  const { closeAuthModal, openAuthModal } = useAuthModal();
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  const [nicknameToCheck, setNicknameToCheck] = useState("");

  const form = useForm<z.infer<typeof SignupValidation>>({
    resolver: zodResolver(SignupValidation),
    defaultValues: {
      firstName: "",
      lastName: "",
      name: "",
      email: "",
      password: "",
      dateOfBirth: "",
      gender: undefined,
      relationshipStatus: undefined,
      occupation: undefined,
      educationLevel: undefined,
    },
  });

  // Watch the name field for changes
  const watchedNickname = form.watch("name");

  // Queries
  const { mutateAsync: createUserAccount, isLoading: isCreatingAccount } =
    useCreateUserAccount();
  const { mutateAsync: resendVerificationEmail, isLoading: isResending } =
    useResendVerificationEmail();
  const { mutateAsync: updateUserEmail, isLoading: isUpdatingEmail } =
    useUpdateUserEmail();
  const { mutateAsync: signInWithGoogle, isLoading: isGoogleLoading } =
    useSignInWithGoogle();
  const { mutateAsync: signInWithFacebook, isLoading: isFacebookLoading } =
    useSignInWithFacebook();

  // Check nickname availability using React Query hook
  const { data: isAvailable, isLoading: isChecking } =
    useCheckNicknameAvailability(nicknameToCheck);

  // Debounce nickname updates to limit queries
  const debouncedSetNickname = useMemo(
    () => debounce(setNicknameToCheck, 1000),
    []
  );

  // Update debounced nickname
  useEffect(() => {
    if (watchedNickname && watchedNickname.length >= 3) {
      debouncedSetNickname(watchedNickname);
    } else {
      setNicknameToCheck("");
    }
  }, [watchedNickname, debouncedSetNickname]);

  // Set error if nickname is not available
  useEffect(() => {
    if (isAvailable === false && !isChecking) {
      form.setError("name", {
        type: "manual",
        message: "This nickname is already taken. Please try a different one.",
      });
      toast({
        title: "Validation Error",
        description:
          "This nickname is already taken. Please try a different one.",
        variant: "destructive",
      });
    } else if (isAvailable === true && !isChecking) {
      form.clearErrors("name");
    }
  }, [isAvailable, isChecking, form, toast]);

  // Debounced resend verification function to prevent spamming
  const handleResendVerification = debounce(async () => {
    try {
      await resendVerificationEmail({
        email: form.getValues("email"),
        password: form.getValues("password"),
      });
      toast({
        title: "Verification Email Sent",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error: any) {
      console.error("Failed to resend verification email:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "Failed to resend verification email. Please try again.",
        variant: "destructive",
      });
    }
  }, 1000);

  // Handle invalid form submission
  const handleInvalid = (errors: any) => {
    Object.values(errors).forEach((error: any) => {
      if (error && error.message) {
        toast({
          title: "Validation Error",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  // Handler for initial signup or email update
  const handleSignup = async (user: z.infer<typeof SignupValidation>) => {
    try {
      // Prevent submission if nickname is taken
      if (form.formState.errors.name) {
        toast({
          title: "Validation Error",
          description:
            form.formState.errors.name.message ||
            "Please fix the nickname error before submitting.",
          variant: "destructive",
        });
        return;
      }

      if (accountId && originalEmail) {
        // Update existing user's email
        await updateUserEmail({
          accountId,
          originalEmail,
          newEmail: user.email,
          password: user.password,
        });
        toast({
          title: "Email Updated",
          description:
            "A new verification email has been sent to your updated email address.",
        });
        setOriginalEmail(user.email);
        setIsVerificationSent(true);
      } else {
        // Create new user account
        const newUser = await createUserAccount(user);
        if (!newUser || !newUser.$id) {
          console.error("User creation failed for email:", user.email);
          toast({
            title: "Error",
            description: "Sign up failed. Please try again.",
            variant: "destructive",
          });
          return;
        }

        const CreatedUser = await updateUserLevelAndPoints(
          newUser.$id,
          UserAction.SIGNUP
        );
        if (CreatedUser) {
          toast({
            description:
              "Thank you for signing up! You've received 10 points. Verify your email to access your account.",
            width: "full",
          });
        }

        setAccountId(newUser.$id);
        setOriginalEmail(user.email);
        setIsVerificationSent(true);
        toast({
          title: "Verification Email Sent",
          description:
            "Please check your inbox (and spam folder) to activate your account.",
        });
      }
    } catch (error: any) {
      console.error("Signup or email update error:", error);
      let errorMessage = "Something went wrong. Please try again.";
      if (error.message.includes("nickname is already taken")) {
        errorMessage =
          "This nickname is already taken. Please choose another one.";
        form.setError("name", {
          type: "manual",
          message: errorMessage,
        });
      } else if (error.code === 409) {
        errorMessage =
          "This email is already registered. Please use a different email.";
      } else if (error.code === 400) {
        errorMessage = "Invalid input. Please check your data.";
      } else if (error.code === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handler for switching to a different email
  const handleUseDifferentEmail = () => {
    const currentValues = form.getValues();
    form.reset({
      ...currentValues,
      email: "",
    });
    setIsVerificationSent(false);
  };

  const handleOAuthSignUp = async (provider: "google" | "facebook") => {
    try {
      const debounceOAuth = setTimeout(async () => {
        if (provider === "google") {
          await signInWithGoogle();
        } else {
          await signInWithFacebook();
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const isLoggedIn = await checkAuthUser();

        if (isLoggedIn) {
          const updatedUser = await updateUserLevelAndPoints(
            user.id,
            UserAction.SIGNUP
          );
          if (updatedUser) {
            toast({
              description: `Thank you for signing up with ${
                provider.charAt(0).toUpperCase() + provider.slice(1)
              }! You've received 10 points.`,
              width: "full",
            });
          }
          if (isModal) {
            closeAuthModal();
          } else {
            navigate("/");
          }
        } else {
          console.error(`OAuth ${provider} authentication verification failed`);
          toast({
            title: "Signup Failed",
            description: "Authentication failed. Please try again.",
            variant: "destructive",
          });
        }
      }, 300);

      return () => clearTimeout(debounceOAuth);
    } catch (error: any) {
      console.error(`Error in OAuth ${provider} signup:`, {
        message: error.message,
        code: error.code,
        type: error.type,
      });
      let errorMessage = `Failed to sign up with ${
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
      } else if (error.code === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <div className="sm:w-420 flex-center flex-col mb-7">
        {/* Fixed section: Title and description */}
        <div className="w-full text-center">
          <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">
            Create a new account
          </h2>
          <p className="text-light-3 small-medium md:base-regular mt-2">
            Sign up with your details or use Google/Facebook
          </p>
        </div>

        {isVerificationSent ? (
          <div className="flex flex-col gap-2 mt-4 w-full">
            <p className="text-center text-light-1">
              A verification email has been sent to {form.getValues("email")}.
              Please check your inbox and spam folder.
            </p>
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full px-6 py-3 bg-blue-400 text-white font-medium text-base rounded-lg shadow-md hover:bg-blue-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              {isResending ? (
                <div className="flex-center gap-2">
                  <Loader /> Resending...
                </div>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
            <Button
              onClick={handleUseDifferentEmail}
              className="w-full px-6 py-3 border border-blue-400 bg-transparent text-blue-400 font-medium text-base rounded-lg shadow-sm hover:bg-blue-50 hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-200"
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <div className="w-full mt-4">
            {/* Scrollable section: Form */}
            <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <form className="flex flex-col gap-2 w-full">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input type="text" className="shad-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input type="text" className="shad-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        Nickname
                      </FormLabel>
                      <FormControl>
                        <Input type="text" className="shad-input" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <div className="flex justify-between gap-4 items-center">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="shad-form_label flex items-center">
                          Gender
                        </FormLabel>
                        <FormControl>
                          <select
                            className="shad-input border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 appearance-none"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? undefined
                                  : e.target.value
                              )
                            }
                            value={field.value || ""}
                          >
                            <option value="" disabled>
                              Select Gender
                            </option>
                            <option value="F">Female</option>
                            <option value="M">Male</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="shad-form_label">
                          Date of Birth
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="shad-input"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Demographic Fields Section */}
                <p className="text-small-regular text-light-3 mt-2">
                  This information is required for analytical purposes only and
                  will not be visible on your public profile.
                </p>
                <FormField
                  control={form.control}
                  name="relationshipStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        Relationship Status
                      </FormLabel>
                      <FormControl>
                        <select
                          className="shad-input border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 appearance-none w-full"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : e.target.value
                            )
                          }
                          value={field.value || ""}
                        >
                          <option value="" disabled>
                            Select Relationship Status
                          </option>
                          {relationshipStatusOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        Occupation
                      </FormLabel>
                      <FormControl>
                        <select
                          className="shad-input border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 appearance-none w-full"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : e.target.value
                            )
                          }
                          value={field.value || ""}
                        >
                          <option value="" disabled>
                            Select Occupation
                          </option>
                          {occupationOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        Education Level
                      </FormLabel>
                      <FormControl>
                        <select
                          className="shad-input border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 appearance-none w-full"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? undefined : e.target.value
                            )
                          }
                          value={field.value || ""}
                        >
                          <option value="" disabled>
                            Select Education Level
                          </option>
                          {educationLevelOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
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
                      <FormLabel className="shad-form_label">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="shad-input"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </div>

            {/* Fixed section: Buttons and links */}
            <div className="flex flex-col gap-3 w-full mt-4">
              <Button
                type="button"
                onClick={form.handleSubmit(handleSignup, handleInvalid)}
                disabled={isCreatingAccount || isUpdatingEmail || isChecking}
                className="shad-button_primary"
              >
                {isCreatingAccount || isUpdatingEmail ? (
                  <div className="flex-center gap-2">
                    <Loader /> Loading...
                  </div>
                ) : accountId ? (
                  "Update Email"
                ) : (
                  "Sign Up"
                )}
              </Button>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => handleOAuthSignUp("google")}
                  disabled={isGoogleLoading || isCreatingAccount}
                  className="w-full px-6 py-3 bg-white text-gray-700 font-medium text-base rounded-lg shadow-md hover:bg-gray-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 border border-gray-300 flex items-center justify-center gap-2"
                >
                  {isGoogleLoading ? (
                    <div className="flex-center gap-2">
                      <Loader /> Signing up...
                    </div>
                  ) : (
                    <>
                      <img
                        src={GoogleIcon}
                        alt="Google Icon"
                        className="w-5 h-5"
                      />
                      Sign up with Google
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleOAuthSignUp("facebook")}
                  disabled={isFacebookLoading || isCreatingAccount}
                  className="w-full px-6 py-3 bg-blue-400 text-white font-medium text-base rounded-lg shadow-md hover:bg-blue-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isFacebookLoading ? (
                    <div className="flex-center gap-2">
                      <Loader /> Signing up...
                    </div>
                  ) : (
                    <>
                      <img
                        src={FacebookIcon}
                        alt="Facebook Icon"
                        className="w-6 h-6"
                      />
                      Sign up with Facebook
                    </>
                  )}
                </Button>
              </div>

              <p className="text-small-regular text-light-2 text-center mt-2">
                Already have an account?{" "}
                <button
                  onClick={() => openAuthModal("signin")}
                  className="text-primary-500 text-small-semibold ml-1"
                >
                  Log in
                </button>
              </p>
              <p className="text-small-regular text-light-2 text-center mt-2">
                <button
                  onClick={() => openAuthModal("business")}
                  className="text-primary-500 text-small-semibold"
                >
                  Create a business account – Apply
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </Form>
  );
};

export default SignupForm;