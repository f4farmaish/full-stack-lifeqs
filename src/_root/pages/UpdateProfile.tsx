import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Textarea, Input, Button } from "@/components/ui";
import { ProfileUploader, Loader } from "@/components/shared";

import { ProfileValidation } from "@/lib/validation";
import { useUserContext } from "@/context/AuthContext";
import { useGetUserById, useUpdateUser } from "@/lib/react-query/queries";
import { formatDateForInput } from "@/lib/utils";
import {
  educationLevelOptions,
  occupationOptions,
  relationshipStatusOptions,
} from "@/constants/demographicOptions";

const UpdateProfile = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, setUser } = useUserContext();

  const id = user.id;

  // Translation mapping functions for dropdown options
  const getTranslatedRelationshipOptions = () => {
    const translationMap: Record<string, string> = {
      "Single": t('updateProfile.relationships.single'),
      "In a relationship": t('updateProfile.relationships.inRelationship'),
      "Engaged": t('updateProfile.relationships.engaged'),
      "Married": t('updateProfile.relationships.married'),
      "It's complicated": t('updateProfile.relationships.complicated'),
    };
    return relationshipStatusOptions.map(option => ({
      value: option,
      label: translationMap[option] || option
    }));
  };

  const getTranslatedOccupationOptions = () => {
    const translationMap: Record<string, string> = {
      "Student": t('updateProfile.occupations.student'),
      "Teacher / Educator": t('updateProfile.occupations.teacher'),
      "Engineer": t('updateProfile.occupations.engineer'),
      "Doctor / Healthcare Worker": t('updateProfile.occupations.doctor'),
      "Nurse": t('updateProfile.occupations.nurse'),
      "Psychologist / Therapist": t('updateProfile.occupations.psychologist'),
      "Artist / Designer": t('updateProfile.occupations.artist'),
      "Writer / Journalist": t('updateProfile.occupations.writer'),
      "IT Specialist / Developer": t('updateProfile.occupations.itSpecialist'),
      "Marketing / Advertising Specialist": t('updateProfile.occupations.marketing'),
      "Salesperson / Consultant": t('updateProfile.occupations.sales'),
      "Entrepreneur / Business Owner": t('updateProfile.occupations.entrepreneur'),
      "Administrative Worker": t('updateProfile.occupations.administrative'),
      "Lawyer / Legal Professional": t('updateProfile.occupations.lawyer'),
      "Finance / Banking Professional": t('updateProfile.occupations.finance'),
      "Scientist / Researcher": t('updateProfile.occupations.scientist'),
      "Architect": t('updateProfile.occupations.architect'),
      "Manual Worker / Technician": t('updateProfile.occupations.manual'),
      "Retail / Customer Service Worker": t('updateProfile.occupations.retail'),
      "Hospitality / Tourism Worker": t('updateProfile.occupations.hospitality'),
      "Chef / Food Service Worker": t('updateProfile.occupations.chef'),
      "Fitness Trainer / Coach": t('updateProfile.occupations.fitness'),
      "Musician / Performer": t('updateProfile.occupations.musician'),
      "Photographer / Videographer": t('updateProfile.occupations.photographer'),
      "Government / Public Service Worker": t('updateProfile.occupations.government'),
      "Human Resources Specialist": t('updateProfile.occupations.hr'),
      "Veterinarian / Animal Care Worker": t('updateProfile.occupations.veterinarian'),
      "Real Estate Agent": t('updateProfile.occupations.realEstate'),
      "Social Worker / Non-profit Worker": t('updateProfile.occupations.socialWorker'),
      "Unemployed / Looking for Opportunities": t('updateProfile.occupations.unemployed'),
      "Other": t('updateProfile.occupations.other'),
    };
    return occupationOptions.map(option => ({
      value: option,
      label: translationMap[option] || option
    }));
  };

  const getTranslatedEducationOptions = () => {
    const translationMap: Record<string, string> = {
      "Student": t('updateProfile.education.student'),
      "High school": t('updateProfile.education.highSchool'),
      "College": t('updateProfile.education.college'),
      "Bachelor's degree": t('updateProfile.education.bachelor'),
      "Master's degree": t('updateProfile.education.master'),
      "Doctorate": t('updateProfile.education.doctorate'),
      "Other": t('updateProfile.education.other'),
    };
    return educationLevelOptions.map(option => ({
      value: option,
      label: translationMap[option] || option
    }));
  };


  const form = useForm<z.infer<typeof ProfileValidation>>({
    resolver: zodResolver(ProfileValidation),
    defaultValues: {
      file: [],
      name: user.name,
      email: user.email,
      bio: user.bio || "",
      dateOfBirth: formatDateForInput(user.dateOfBirth),
      gender: user.gender || "M",
      relationshipStatus: user.relationshipStatus || "",
      occupation: user.occupation || "",
      educationLevel: user.educationLevel || "",
    },
  });

  // Queries
  const { data: currentUser } = useGetUserById(id);
  const { mutateAsync: updateUser, isLoading: isLoadingUpdate } =
    useUpdateUser();

  if (!currentUser)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  // Handler
  const handleUpdate = async (value: z.infer<typeof ProfileValidation>) => {

    const updatedUser = await updateUser({
      userId: currentUser.$id,
      name: value.name,
      bio: value.bio,
      file: value.file,
      imageUrl: currentUser.imageUrl,
      imageId: currentUser.imageId || "",
      dateOfBirth: value.dateOfBirth,
      gender: value.gender,
      relationshipStatus: value.relationshipStatus,
      occupation: value.occupation,
      educationLevel: value.educationLevel,
    });

    if (!updatedUser) {
      toast({ title: t('updateProfile.updateFailed') });
      return;
    }
    setUser({
      ...user,
      name: updatedUser?.name,
      bio: updatedUser?.bio,
      imageUrl: updatedUser?.imageUrl,
      imageId: updatedUser?.imageId || "",
      dateOfBirth: updatedUser?.dateOfBirth,
      gender: updatedUser?.gender,
      relationshipStatus: updatedUser?.relationshipStatus,
      occupation: updatedUser?.occupation,
      educationLevel: updatedUser?.educationLevel,
    });


    return navigate(`/profile/${id}`);
  };

  return (
    <div className="flex flex-1 mt-12">
      <div className="common-container">
        <div className="flex-start gap-3 justify-start w-full max-w-5xl">
          <img
            src="/assets/icons/edit.svg"
            width={36}
            height={36}
            alt="edit"
            className="invert-white"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full">{t('updateProfile.editProfile')}</h2>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleUpdate)}
            className="flex flex-col gap-7 w-full mt-4 max-w-5xl">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem className="flex">
                  <FormControl>
                    <ProfileUploader
                      fieldChange={field.onChange}
                      mediaUrl={currentUser.imageUrl}
                    />
                  </FormControl>
                  <FormMessage className="shad-form_message" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">{t('updateProfile.name')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      className="shad-input"
                      {...field}
                      disabled
                    />
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
                  <FormLabel className="shad-form_label">{t('updateProfile.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      className="shad-input"
                      {...field}
                      disabled
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-6 w-full">
              {/* Date of Birth - Left */}
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel className="shad-form_label text-sm font-medium text-gray-800 dark:text-gray-300">
                      {t('updateProfile.dateOfBirth')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="shad-input w-full border-gray-300 bg-light-3 dark:bg-gray-800 text-gray-800 dark:text-white rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender - Right */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel className="shad-form_label text-sm font-medium text-gray-800 dark:text-gray-300">
                      {t('updateProfile.gender')}
                    </FormLabel>
                    <FormControl>
                      <select
                        className="shad-input w-full border-gray-300 bg-light-3 dark:bg-gray-800 text-gray-800 dark:text-white rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                        {...field}
                        disabled>
                        <option value="M">{t('updateProfile.male')}</option>
                        <option value="F">{t('updateProfile.female')}</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">{t('updateProfile.bio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="shad-textarea custom-scrollbar"
                      maxLength={150} // Enforces max length on UI
                      {...field}
                      onChange={(e) => {
                        if (e.target.value.length <= 150) {
                          field.onChange(e);
                        }
                      }}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-700 dark:text-gray-400 mt-1">
                    {t('updateProfile.charactersCount', { count: field.value.length })}
                  </div>
                  <FormMessage className="shad-form_message" />
                </FormItem>
              )}
            />

            <p className="text-sm text-gray-700 dark:text-gray-400 mt-4">
              {t('updateProfile.privacyNotice')}
            </p>

            <FormField
              control={form.control}
              name="relationshipStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">
                    {t('updateProfile.relationshipStatus')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className="shad-input w-full border-gray-300 bg-gray-800 text-white rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                      {...field}>
                      {getTranslatedRelationshipOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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
                  <FormLabel className="shad-form_label">{t('updateProfile.occupation')}</FormLabel>
                  <FormControl>
                    <select
                      className="shad-input w-full border-gray-300 bg-gray-800 text-white rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                      {...field}>
                      {getTranslatedOccupationOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
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
                    {t('updateProfile.educationLevel')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className="shad-input w-full border-gray-300 bg-gray-800 text-white rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 appearance-none"
                      {...field}>
                      {getTranslatedEducationOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 items-center justify-end">
              <Button
                type="button"
                className="bg-gray-200 dark:bg-dark-4 text-gray-800 dark:text-light-1 hover:bg-gray-300 dark:hover:bg-dark-3 px-6 py-2 rounded-lg transition-colors"
                onClick={() => navigate(-1)}>
                {t('updateProfile.cancel')}
              </Button>
              <Button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingUpdate}>
                {isLoadingUpdate && <Loader />}
                {t('updateProfile.updateProfile')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default UpdateProfile;