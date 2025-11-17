import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import { useUpdateUser } from "@/lib/react-query/queries";
import { CompleteProfileValidation } from "@/lib/validation";
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
import { useToast } from "@/components/ui/use-toast";
import {
  relationshipStatusOptions,
  occupationOptions,
  educationLevelOptions,
} from "@/constants/demographicOptions";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isProfileComplete } from "@/lib/utils";
import { debounce } from "lodash";
import { useCheckNicknameAvailability } from "@/lib/react-query/queries";

const CompleteProfile = () => {
  const { user, checkAuthUser, setUser } = useUserContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updateUser, isLoading } = useUpdateUser();
  const [nicknameToCheck, setNicknameToCheck] = useState("");

  const form = useForm<z.infer<typeof CompleteProfileValidation>>({
    resolver: zodResolver(CompleteProfileValidation),
    defaultValues: {
      name: user.name || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || undefined,
      relationshipStatus: user.relationshipStatus || "",
      occupation: user.occupation || "",
      educationLevel: user.educationLevel || "",
    },
  });

  // Watch the name field for changes if showing
  const watchedNickname = form.watch("name");

  // Check nickname availability using React Query hook
  const { data: isAvailable, isLoading: isChecking } =
    useCheckNicknameAvailability(nicknameToCheck);

  // Debounce nickname updates to limit queries
  const debouncedSetNickname = useMemo(
    () => debounce(setNicknameToCheck, 1000),
    []
  );

  // Update debounced nickname only if nickname field is shown
  useEffect(() => {
    if (!user.name && watchedNickname && watchedNickname.length >= 3) {
      debouncedSetNickname(watchedNickname);
    } else {
      setNicknameToCheck("");
    }
  }, [user.name, watchedNickname, debouncedSetNickname]);

  // Set error if nickname is not available
  useEffect(() => {
    if (!user.name && isAvailable === false && !isChecking) {
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
    } else if (!user.name && isAvailable === true && !isChecking) {
      form.clearErrors("name");
    }
  }, [user.name, isAvailable, isChecking, form, toast]);

  const handleSubmit = async (
    values: z.infer<typeof CompleteProfileValidation>
  ) => {
    try {
      const updates = {
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        relationshipStatus: values.relationshipStatus,
        occupation: values.occupation,
        educationLevel: values.educationLevel,
      };

      if (values.name && values.name.trim() !== "") {
        updates.name = values.name;
      }

      const updatedUser = await updateUser({
        userId: user.id,
        ...updates,
        bio: user.bio || "",
        imageId: user.imageId || "",
        imageUrl: user.imageUrl,
        file: [],
      });
      if (updatedUser) {
        queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        const isContextUpdated = await checkAuthUser();
        if (isContextUpdated && isProfileComplete(user)) {
          toast({ title: "Profile updated successfully" });
          navigate("/");
        } else {
          console.warn(
            "Context not updated or profile incomplete, manual redirect attempt"
          );
          setUser((prev) => ({
            ...prev,
            ...updates,
          }));
          toast({ title: "Profile updated successfully" });
          navigate("/");
        }
      } else {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isProfileComplete(user)) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-1 min-h-screen">
      {/* Formulaire */}
      <section className="flex flex-1 justify-center items-start flex-col py-10 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
        <img
          src="/assets/images/lifeqss.png"
          alt="logo"
          width="200"
          height="50"
          className="self-center"
        />

        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12 self-center">
          Complete Your Profile
        </h2>
        <p className="text-light-3 small-medium md:base-regular mt-2 text-center">
          Please provide the following information to finalize your
          registration.
        </p>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4 w-full mt-4">
            {!user.name && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="shad-form_label">Nickname</FormLabel>
                    <FormControl>
                      <Input type="text" className="shad-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">
                    Date of Birth
                  </FormLabel>
                  <FormControl>
                    <Input type="date" className="shad-input" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">Gender</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
                      className="shad-input rounded-md">
                      <option value="">Select Gender</option>
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
              name="relationshipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">
                    Relationship Status
                  </FormLabel>
                  <FormControl>
                    <select {...field} className="shad-input rounded-md">
                      <option value="">Select Relationship Status</option>
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
                  <FormLabel className="shad-form_label">Occupation</FormLabel>
                  <FormControl>
                    <select {...field} className="shad-input rounded-md">
                      <option value="">Select Occupation</option>
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
                    <select {...field} className="shad-input rounded-md">
                      <option value="">Select Education Level</option>
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

            <Button
              type="submit"
              disabled={isLoading}
              className="shad-button_primary">
              {isLoading ? "Updating..." : "Complete Profile"}
            </Button>
          </form>
        </Form>
      </section>

      {/* Image latérale (visible uniquement sur grand écran) */}
      <img
        src="/assets/images/side-imgg.png"
        alt="side"
        className="hidden xl:block h-screen w-auto object-cover"
      />
    </div>
  );
};

export default CompleteProfile;