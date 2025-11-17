import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
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
import { ForgotPasswordValidation } from "@/lib/validation";
import { useCreatePasswordRecovery } from "@/lib/react-query/queries";
import { useAuthModal } from "@/context/AuthModalContext";

interface ForgotPasswordFormProps {
  isModal?: boolean;
}

const ForgotPasswordForm = ({ isModal = false }: ForgotPasswordFormProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { closeAuthModal, openAuthModal } = useAuthModal();
  const { mutateAsync: createPasswordRecovery, isLoading } =
    useCreatePasswordRecovery();

  const form = useForm<z.infer<typeof ForgotPasswordValidation>>({
    resolver: zodResolver(ForgotPasswordValidation),
    defaultValues: {
      email: "",
    },
  });

  // Debounced handler for password recovery request
  const handleForgotPassword = debounce(
    async (data: z.infer<typeof ForgotPasswordValidation>) => {
      try {
        await createPasswordRecovery({
          email: data.email,
          redirectUrl: `${window.location.origin}/reset-password`,
        });
        toast({
          title: "Password Reset Email Sent",
          description:
            "Please check your inbox (and spam folder) for a password reset email.",
        });
        form.reset();
        if (isModal) {
          setTimeout(() => closeAuthModal(), 2000); // Close modal after 2s
        } else {
          navigate("/sign-in");
        }
      } catch (error: any) {
        console.error("Password recovery error:", error);
        toast({
          title: "Error",
          description:
            error.message ||
            "Failed to send password reset email. Please try again.",
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
        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">
          Reset Your Password
        </h2>
        <p className="text-light-3 small-medium md:base-regular mt-2">
          Enter your email to receive a password reset link.
        </p>
        <form
          onSubmit={form.handleSubmit(handleForgotPassword)}
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
          <Button
            type="submit"
            className="w-full px-6 py-3 bg-blue-400 text-white font-medium text-base rounded-lg shadow-md hover:bg-blue-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Sending...
              </div>
            ) : (
              "Send Reset Link"
            )}
          </Button>
          <p className="text-small-regular text-light-2 text-center mt-2">
            Remember your password?{" "}
            <button
              onClick={() => openAuthModal("signin")}
              className="text-primary-500 text-small-semibold"
            >
              Log in
            </button>
          </p>
          <p className="text-small-regular text-light-2 text-center mt-2">
            Don't have an account?{" "}
            <button
              onClick={() => openAuthModal("signup")}
              className="text-primary-500 text-small-semibold"
            >
              Sign up
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
        </form>
      </div>
    </Form>
  );
};

export default ForgotPasswordForm;