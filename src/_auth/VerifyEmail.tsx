import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import Loader from "@/components/shared/Loader";
import { useVerifyEmail } from "@/lib/react-query/queries";

const VerifyEmail = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutateAsync: verifyEmail, isLoading } = useVerifyEmail();

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      console.error("Missing userId or secret in verification URL");
      toast({
        title: "Invalid Verification Link",
        description: "The verification link is invalid or expired.",
        variant: "destructive",
      });
      navigate("/sign-in");
      return;
    }

    const handleVerification = async () => {
      try {
        await verifyEmail({ userId, secret });
        toast({
          title: "Email Verified",
          description: "Your email has been verified. You can now log in.",
        });
        navigate("/sign-in");
      } catch (error: any) {
        console.error("Email verification failed:", error);
        toast({
          title: "Verification Failed",
          description:
            error.message || "Failed to verify email. Please try again.",
          variant: "destructive",
        });
        navigate("/sign-in");
      }
    };

    handleVerification();
  }, [searchParams, verifyEmail, toast, navigate]);

  return (
    <div className="flex-center flex-col h-screen">
      {isLoading ? (
        <div className="flex-center gap-2">
          <Loader /> Verifying your email...
        </div>
      ) : (
        <p>Processing email verification...</p>
      )}
    </div>
  );
};

export default VerifyEmail;
