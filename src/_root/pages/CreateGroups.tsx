import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader, FileUploader } from "@/components/shared";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Textarea,
  Input,
} from "@/components/ui";
import { toast, useToast } from "@/components/ui/use-toast";
import { getCurrentUser } from "@/services/authService";
import { createGroup } from "@/services/groupService";
import { getAllCategories } from "@/services/categoryService";
import { GroupValidation } from "@/lib/validation";
import { useTranslation } from "react-i18next";

// Define mutation hook for creating groups
const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: createGroup,
    onMutate: async (groupData) => {
      // Cancel any ongoing queries to ensure fresh data
      await queryClient.cancelQueries(["groups"]);
      await queryClient.cancelQueries(["currentUser"]);
    },
    onSuccess: (newGroup) => {
      toast({
        title: t('createGroups.success'),
        description: t('createGroups.groupCreatedSuccess'),
        variant: "default",
        className: "bottom-right-toast",
      });
      // Invalidate queries to refresh group and user data
      queryClient.invalidateQueries(["groups"]);
      queryClient.invalidateQueries(["currentUser"]);
    },
    onError: (error) => {
      console.error("Error creating group:", error);
      toast({
        title: t('createGroups.error'),
        description:
          error instanceof Error
            ? error.message
            : t('createGroups.failedToCreate'),
        variant: "destructive",
        className: "bottom-right-toast",
      });
    },
  });
};

const CreateGroups = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedSubCategory = location.state?.subCategory || "";
  const preselectedCategory = location.state?.categoryId || "";
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories and subcategories
  const { data: categories } = useQuery(["categories"], getAllCategories);

  // Fetch current user
  const { data: user } = useQuery(["currentUser"], getCurrentUser);

  // State for selected category and subcategory
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string>(preselectedCategory);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(
    preselectedSubCategory
  );

  // Initialize form with validation
  const form = useForm<z.infer<typeof GroupValidation>>({
    resolver: zodResolver(GroupValidation),
    defaultValues: {
      name: "",
      description: "",
      categoryId: preselectedCategory,
      subCategory: preselectedSubCategory,
      tags: "",
      file: [],
    },
  });

  // Watch name and description for character counts
  const nameValue = form.watch("name");
  const descriptionValue = form.watch("description") || "";

  // Use mutation for group creation
  const { mutate: createGroupMutation } = useCreateGroup();

  const onSubmit = async (data: z.infer<typeof GroupValidation>) => {
    if (!user?.$id) {
      toast({
        title: t('createGroups.error'),
        description: t('createGroups.userNotLoggedIn'),
        variant: "destructive",
        className: "bottom-right-toast",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const groupData = {
        ...data,
        categoryId: selectedCategoryId,
        subCategory: selectedSubCategory,
        creatorId: user.$id,
        creatorName: user.name || "Anonymous",
        creatorImageUrl:
          user.imageUrl || "/assets/icons/profile-placeholder.svg",
        admins: [user.$id],
        file: data.file && data.file.length > 0 ? data.file : [],
      };

      // Process tags: split by comma, trim, filter empty, limit to 5
      const processedTags = data.tags
        ?.split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
        .slice(0, 5)
        .join(",");
      if (data.tags && processedTags !== data.tags) {
        groupData.tags = processedTags;
      }

      createGroupMutation(groupData, {
        onSuccess: (newGroup) => {
          form.reset();
          navigate(`/groups/${newGroup.$id}`);
        },
      });
    } catch (error) {
      console.error("Unexpected error in onSubmit:", error);
      toast({
        title: t('createGroups.error'),
        description: t('createGroups.unexpectedError'),
        variant: "destructive",
        className: "bottom-right-toast",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1">
      <div className="common-container -mt-10">
        {/* Back Button Section */}
        <div className="max-w-5xl w-full -mb-8 -ml-40">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="shad-button_ghost back-button">
            <img
              src="/assets/icons/back.svg"
              alt="back"
              width={24}
              height={24}
            />
            <p className="small-medium lg:base-medium">{t('createGroups.back')}</p>
          </Button>
        </div>
        <div className="max-w-5xl flex-start gap-3 justify-start w-full">
          <img
            src="/assets/icons/add-group.svg"
            width={36}
            height={36}
            alt="add"
          />
          <h2 className="h3-bold md:h2-bold text-left w-full mt">
            {t('createGroups.createGroup')}
          </h2>
        </div>

        {/* Form Section */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-9 w-full max-w-5xl">
            {/* Group Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2">{t('createGroups.groupNameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('createGroups.groupNamePlaceholder')}
                      type="text"
                      className="shad-input"
                      maxLength={150}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500 mt-1">
                    {t('createGroups.characterCount', { count: nameValue.length, max: 150 })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description and Group Image */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        {t('createGroups.groupDescriptionLabel')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('createGroups.groupDescriptionPlaceholder')}
                          className="shad-textarea custom-scrollbar h-40"
                          maxLength={2000}
                          {...field}
                        />
                      </FormControl>
                      <div className="text-sm text-gray-500 mt-1">
                        {t('createGroups.characterCount', { count: descriptionValue.length, max: 2000 })}
                      </div>
                      <FormMessage className="shad-form_message" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="w-full md:w-1/3">
                <FormField
                  control={form.control}
                  name="file"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="shad-form_label">
                        {t('createGroups.addGroupImage')}
                      </FormLabel>
                      <FormControl>
                        <FileUploader
                          fieldChange={(files: File[]) => {
                            field.onChange(files);
                          }}
                          mediaUrl=""
                        />
                      </FormControl>
                      <FormMessage className="shad-form_message" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-light-3">
                    {t('createGroups.categoryLabel')}
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        setSelectedSubCategory("");
                        field.onChange(e);
                      }}
                      className="w-full border border-dark-4 bg-dark-3 text-light-3 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all">
                      <option value="" className="text-light-3">
                        {t('createGroups.selectCategory')}
                      </option>
                      {categories?.map((category: any) => (
                        <option
                          key={category.$id}
                          value={category.$id}
                          className="text-light-2">
                          {category.name}
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
              name="subCategory"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-light-3">
                    {t('createGroups.subcategoryLabel')}
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={selectedSubCategory}
                      onChange={(e) => {
                        setSelectedSubCategory(e.target.value);
                        field.onChange(e);
                      }}
                      className="w-full border border-dark-4 bg-dark-3 text-light-3 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!selectedCategoryId}>
                      <option value="" className="text-light-3">
                        {t('createGroups.selectSubcategory')}
                      </option>
                      {categories
                        ?.find((cat: any) => cat.$id === selectedCategoryId)
                        ?.subCategories?.map(
                          (subCat: string, index: number) => (
                            <option
                              key={index}
                              value={subCat}
                              className="text-light-2">
                              {subCat}
                            </option>
                          )
                        )}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">
                    {t('createGroups.tagsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('createGroups.tagsPlaceholder')}
                      type="text"
                      className="shad-input"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage className="shad-form_message" />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-4 items-center justify-end">
              <Button
                type="button"
                className="shad-button_dark_4"
                onClick={() => navigate(-1)}>
                {t('createGroups.cancel')}
              </Button>
              <Button
                type="submit"
                className="shad-button_primary"
                disabled={isSubmitting}>
                {isSubmitting && <Loader />}
                {t('createGroups.createGroupButton')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreateGroups;
