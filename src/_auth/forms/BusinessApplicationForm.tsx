import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
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
import { databases } from "@/lib/appwrite/config";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Query } from "appwrite";
import { useAuthModal } from "@/context/AuthModalContext";

// Define the validation schema using zod
const BusinessApplicationValidation = z.object({
  companyName: z.string().min(1, "Company name is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  businessEmail: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+\d{1,15}$/, "Phone number must start with '+' and contain 1–15 digits (e.g., +1234567890)"),
});

interface BusinessApplicationFormProps {
  isModal?: boolean;
}

const BusinessApplicationForm = ({ isModal = false }: BusinessApplicationFormProps) => {
  const { toast } = useToast();
  const { closeAuthModal, openAuthModal } = useAuthModal();
  const form = useForm<z.infer<typeof BusinessApplicationValidation>>({
    resolver: zodResolver(BusinessApplicationValidation),
    defaultValues: {
      companyName: "",
      registrationNumber: "",
      businessEmail: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  // Function to check if email already exists in users or businessApplications collections
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const [usersResult, applicationsResult] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal("email", email), Query.limit(1)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.businessApplicationsCollectionId,
          [Query.equal("businessEmail", email), Query.limit(1)]
        ),
      ]);
      return usersResult.total > 0 || applicationsResult.total > 0;
    } catch (error) {
      console.error("Error checking email existence:", error);
      throw new Error("Failed to check email availability");
    }
  };

  // React Query mutation for submitting the application
  const { mutate, isPending } = useMutation({
    mutationFn: async (values: z.infer<typeof BusinessApplicationValidation>) => {
      // Check if email is already in use
      const emailExists = await checkEmailExists(values.businessEmail);
      if (emailExists) {
        throw new Error("This email is already associated with an account or application.");
      }

      // Create new business application document
      return databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.businessApplicationsCollectionId,
        ID.unique(),
        {
          companyName: values.companyName,
          registrationNumber: values.registrationNumber,
          businessEmail: values.businessEmail,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: values.phoneNumber,
          status: "pending",
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your business account application has been submitted and is pending review.",
      });
      form.reset();
      if (isModal) {
        setTimeout(() => closeAuthModal(), 2000); // Close modal after 2s
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  }) as any;

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof BusinessApplicationValidation>) => {
    mutate(values);
  };

  return (
    <div className="sm:w-420 flex-center flex-col mb-16">
      <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">Apply for Business Account</h2>
      <p className="text-light-3 small-medium md:base-regular mt-2">
        Please fill in the details below
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-2 w-full mt-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="businessEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Email</FormLabel>
                <FormControl>
                  <Input type="email" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
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
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input type="text" className="shad-input" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number (e.g., +1234567890)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    className="shad-input"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={isPending}
            className="shad-button_primary"
          >
            {isPending ? "Submitting..." : "Submit Application"}
          </Button>
          <p className="text-small-regular text-light-2 text-center mt-2">
            Already have an account?{" "}
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
        </form>
      </Form>
    </div>
  );
};

export default BusinessApplicationForm;