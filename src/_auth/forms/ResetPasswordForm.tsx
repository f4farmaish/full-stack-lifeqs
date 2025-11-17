import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { debounce } from "lodash";
import { useEffect } from "react";
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
import { ResetPasswordValidation } from "@/lib/validation";
import { useUpdatePasswordRecovery } from "@/lib/react-query/queries";

const ResetPasswordForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { mutateAsync: updatePasswordRecovery, isLoading } =
    useUpdatePasswordRecovery();

  const form = useForm<z.infer<typeof ResetPasswordValidation>>({
    resolver: zodResolver(ResetPasswordValidation),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if on reset-password path and validate query params
  useEffect(() => {
    if (location.pathname === "/reset-password") {
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");

      if (!userId || !secret) {
        console.error("Missing userId or secret in reset URL");
        toast({
          title: "Invalid Reset Link",
          description: "The password reset link is invalid or expired.",
          variant: "destructive",
        });
        navigate("/sign-in");
      }
    }
  }, [location.pathname, searchParams, navigate, toast]);

  // Debounced handler for password reset
  const handleResetPassword = debounce(
    async (data: z.infer<typeof ResetPasswordValidation>) => {
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");

      if (!userId || !secret) {
        console.error("Missing userId or secret during form submission");
        toast({
          title: "Invalid Reset Link",
          description: "The password reset link is invalid or expired.",
          variant: "destructive",
        });
        navigate("/sign-in");
        return;
      }

      try {
        await updatePasswordRecovery({
          userId,
          secret,
          password: data.password,
          confirmPassword: data.confirmPassword,
        });
        toast({
          title: "Password Reset Successful",
          description:
            "Your password has been updated. Please log in with your new password.",
        });
        form.reset();
        navigate("/sign-in");
      } catch (error: any) {
        console.error("Password reset error:", error);
        toast({
          title: "Error",
          description:
            error.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    },
    1000
  );

  return (
    <Form {...form}>
      <div className="sm:w-420 flex-center flex-col">
        <img
          src="/assets/images/lifeqss.png"
          alt="logo"
          width="200"
          height="50"
        />
        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">Set New Password</h2>
        <p className="text-light-3 small-medium md:base-regular mt-2">
          Enter and confirm your new password.
        </p>
        <form
          onSubmit={form.handleSubmit(handleResetPassword)}
          className="flex flex-col gap-5 w-full mt-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">New Password</FormLabel>
                <FormControl>
                  <Input type="password" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="shad-form_label">
                  Confirm Password
                </FormLabel>
                <FormControl>
                  <Input type="password" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full px-6 py-3 bg-blue-400 text-white font-medium text-base rounded-lg shadow-md hover:bg-blue-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            disabled={isLoading}>
            {isLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Resetting...
              </div>
            ) : (
              "Reset Password"
            )}
          </Button>
          <p className="text-small-regular text-light-2 text-center mt-2">
            Back to login?{" "}
            <Link
              to="/sign-in"
              className="text-primary-500 text-small-semibold">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </Form>
  );
};

export default ResetPasswordForm;
