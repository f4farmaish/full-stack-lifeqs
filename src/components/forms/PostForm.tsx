import * as z from "zod";
import { Models } from "appwrite";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useCallback } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Button,
  Input,
  Textarea,
} from "@/components/ui";
import { PostValidation } from "@/lib/validation";
import { useToast } from "@/components/ui/use-toast";
import { useUserContext } from "@/context/AuthContext";
import { FileUploader, Loader } from "@/components/shared";
import { useCreatePost, useUpdatePost } from "@/lib/react-query/queries";
import { databases } from "@/lib/appwrite/config";
import { updateUserLevelAndPoints } from "@/services/userService";
import { UserAction } from "@/lib/pointsMapping";
import { canUserPerformAction } from "@/lib/levelUtils";
import { INewPost } from "@/types";

type PostFormProps = {
  post?: Models.Document & {
    title: string;
    description?: string;
    imageUrl?: string;
    imageId?: string;
    categoryIdString: string;
    subCategory?: string;
    isAnonymous: boolean;
    tags: string[];
    isDraft: boolean;
    groupIdString?: string;
    creator: { $id: string };
  };
  action: "Create" | "Update";
  groupId?: string;
};

const PostForm = ({ post, action, groupId }: PostFormProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useUserContext();
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [groupCategory, setGroupCategory] = useState<string | null>(null);
  const [groupSubCategory, setGroupSubCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof PostValidation>>({
    resolver: zodResolver(PostValidation),
    defaultValues: {
      title: action === "Update" && post ? post.title : "",
      description: action === "Update" && post ? post.description || "" : "",
      file: [],
      imageUrl: action === "Update" && post ? post.imageUrl || "" : "",
      tags: action === "Update" && post ? post.tags.join(", ") : "",
      categoryId: action === "Update" && post ? post.categoryIdString : "",
      subCategory: action === "Update" && post ? post.subCategory || "" : "",
      isAnonymous: action === "Update" && post ? post.isAnonymous : false,
    },
  });

  // Watch title and description for character counts
  const titleValue = form.watch("title");
  const descriptionValue = form.watch("description") || "";

  // Log character counts for debugging
  useEffect(() => {
  }, [titleValue, descriptionValue]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID!
      );
      setCategories(response.documents);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: t("createPost.failedToLoadCategories"),
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      const selectedCategory = categories.find((cat) => cat.$id === categoryId);
      if (selectedCategory) {
        setSubCategories(selectedCategory.subCategories || []);
        form.setValue("subCategory", "");
      }
    },
    [categories, form]
  );

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroupDetails = async () => {
      try {
        const group = await databases.getDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID!,
          import.meta.env.VITE_APPWRITE_GROUPS_COLLECTION_ID!,
          groupId
        );

        const extractedCategoryId =
          typeof group.categoryId === "object"
            ? group.categoryId.$id
            : group.categoryId;
        const extractedSubCategory = group.subCategory;

        if (extractedCategoryId && extractedSubCategory) {
          setGroupCategory(extractedCategoryId);
          setGroupSubCategory(extractedSubCategory);

          if (action === "Create" || (post && post.groupIdString === groupId)) {
            form.resetField("categoryId", {
              defaultValue: extractedCategoryId,
            });
            form.resetField("subCategory", {
              defaultValue: extractedSubCategory,
            });
            const selectedCategory = categories.find(
              (cat) => cat.$id === extractedCategoryId
            );
            if (selectedCategory) {
              setSubCategories(selectedCategory.subCategories || []);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
        toast({
          title: t("createPost.failedToLoadGroupDetails"),
          variant: "destructive",
        });
      }
    };

    fetchGroupDetails();
  }, [groupId, action, post, form, categories]);

  useEffect(() => {
    if (action !== "Update" || !post || groupId || !post.categoryIdString)
      return;

    const selectedCategory = categories.find(
      (cat) => cat.$id === post.categoryIdString
    );
    if (selectedCategory) {
      setSubCategories(selectedCategory.subCategories || []);
    }
  }, [action, post, groupId, categories]);

  const { mutateAsync: createPost, isLoading: isLoadingCreate } =
    useCreatePost();
  const { mutateAsync: updatePost } = useUpdatePost();

  const handleSubmit = async (value: z.infer<typeof PostValidation>) => {
    if (isSubmitting || isLoadingCreate) return;

    setIsSubmitting(true);
    try {
      if (action === "Create") {
        if (!isAuthenticated) {
          toast({
            title: t("createPost.pleaseLogin"),
            variant: "destructive",
          });
          return;
        }

        if (!canUserPerformAction(user, "ADD_POST")) {
          toast({
            title: t("createPost.questionLimitReached"),
            description: t("createPost.questionLimitDescription"),
            variant: "destructive",
          });
          return;
        }

        const payload: INewPost = {
          ...value,
          userId: user.id,
          isAnonymous: value.isAnonymous || false,
          imageUrl: value.imageUrl || null,
          file: value.file && value.file.length > 0 ? value.file : [],
          groupId: groupId || null,
          createdAt: new Date().toISOString(),
          isDraft: true,
        };

        const newPost = await createPost(payload);
        toast({ title: t("createPost.previewingPost") });
        navigate(`/posts/${newPost.$id}`);
      } else if (action === "Update" && post) {
        const payload = {
          postId: post.$id,
          title: value.title,
          description: value.description || undefined,
          file: value.file && value.file.length > 0 ? value.file : undefined,
          imageUrl: value.imageUrl || undefined,
          categoryId: value.categoryId || undefined,
          subCategory: value.subCategory || undefined,
          isAnonymous: value.isAnonymous || false,
        };

        await updatePost(payload);
        toast({ title: t("createPost.postUpdatedSuccess"), variant: "default" });

        if (!post.isDraft) {
          try {
            await updateUserLevelAndPoints(
              post.creator.$id,
              UserAction.UPDATE_QUESTION
            );
            toast({
              title: t("createPost.pointsDeducted"),
              description: t("createPost.pointsDeductedDescription"),
              variant: "destructive",
            });
          } catch (pointsError) {
            console.error("Error updating user points:", pointsError);
            toast({
              title: t("createPost.failedToUpdatePoints"),
              description:
                pointsError instanceof Error
                  ? pointsError.message
                  : t("createPost.somethingWentWrong"),
              variant: "destructive",
            });
          }
        } 

        navigate(`/posts/${post.$id}`);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      toast({
        title: t("createPost.errorOccurred"),
        description:
          error instanceof Error ? error.message : t("createPost.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      toast({ title: t("createPost.pleaseLoginDraft"), variant: "destructive" });
      return;
    }

    if (isSubmitting || isLoadingCreate) return;

    setIsSubmitting(true);
    try {
      const formValues = form.getValues();
      const payload: INewPost = {
        ...formValues,
        userId: user.id,
        isAnonymous: formValues.isAnonymous || false,
        imageUrl: formValues.imageUrl || null,
        file:
          formValues.file && formValues.file.length > 0 ? formValues.file : [],
        groupId: groupId || null,
        createdAt: new Date().toISOString(),
        isDraft: true,
      };

      await createPost(payload);
      toast({ title: t("createPost.draftSavedSuccess"), variant: "default" });
      navigate("/my-drafts", { state: { groupId } });
    } catch (error) {
      console.error("Error in handleSaveDraft:", error);
      toast({
        title: t("createPost.errorOccurred"),
        description:
          error instanceof Error ? error.message : t("createPost.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-9 w-full max-w-5xl">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">{t("createPost.questionTitle")}</FormLabel>
              <FormControl>
                <Input
                  className="shad-input"
                  placeholder={t("createPost.questionTitlePlaceholder")}
                  maxLength={150}
                  {...field}
                />
              </FormControl>
              <div className="text-sm text-gray-500 mt-1">
                {titleValue.length}/150
              </div>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="shad-form_label">
                    {t("createPost.addDetails")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="shad-textarea custom-scrollbar h-40"
                      placeholder={t("createPost.addDetailsPlaceholder")}
                      maxLength={2000}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500 mt-1">
                    {descriptionValue.length}/2000
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
                    {t("createPost.addPhoto")}
                  </FormLabel>
                  <FormControl>
                    <FileUploader
                      fieldChange={(files: File[]) => {
                        field.onChange(files);
                        if (files.length === 0) {
                          form.setValue("imageUrl", "");
                        }
                      }}
                      mediaUrl={(() => {
                        const formImageUrl = form.getValues("imageUrl");
                        const postImageUrl = post?.imageUrl || "";
                        return formImageUrl || postImageUrl;
                      })()}
                      onImageDelete={() => {
                        form.setValue("file", []);
                        form.setValue("imageUrl", "");
                      }}
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
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="shad-form_label">
                {t("createPost.addTags")}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t("createPost.tagsPlaceholder")}
                  type="text"
                  className="shad-input"
                  {...field}
                  onChange={(e) => {
                    const input = e.target.value;
                    const tags = input.split(",").map((tag) => tag.trim());
                    if (tags.length <= 5) {
                      field.onChange(input);
                    } else {
                      toast({
                        title: t("createPost.tagLimitExceeded"),
                        description: t("createPost.tagLimitDescription"),
                        variant: "destructive",
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-light-2 mb-2">
                {t("createPost.selectCategory")}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <select
                    {...field}
                    disabled={!!groupId}
                    className="block w-full px-4 py-3 text-sm text-light-1 bg-dark-3 border border-dark-4 rounded-lg shadow-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition ease-in-out duration-300 hover:bg-dark-4"
                    onChange={(e) => {
                      if (!groupId) {
                        field.onChange(e.target.value);
                        handleCategoryChange(e.target.value);
                      }
                    }}>
                    <option value="" disabled className="text-light-4">
                      {groupId
                        ? t("createPost.categoryAutoSelected")
                        : t("createPost.selectCategoryOption")}
                    </option>
                    {categories.map((category) => (
                      <option
                        key={category.$id}
                        value={category.$id}
                        className="text-light-1">
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </FormControl>
              <FormMessage className="text-sm text-red mt-2" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-light-2 mb-2">
                {t("createPost.selectSubcategory")}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <select
                    {...field}
                    disabled={!!groupId}
                    className="block w-full px-4 py-3 text-sm text-light-1 bg-dark-3 border border-dark-4 rounded-lg shadow-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition ease-in-out duration-300 hover:bg-dark-4">
                    {groupId ? (
                      <option value={groupSubCategory ?? ""}>
                        {groupSubCategory || t("createPost.noSubcategory")}
                      </option>
                    ) : (
                      <>
                        <option value="" disabled>
                          {t("createPost.selectSubcategoryOption")}
                        </option>
                        {subCategories.map((subCategory) => (
                          <option key={subCategory} value={subCategory}>
                            {subCategory}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </FormControl>
              <FormMessage className="text-sm text-red mt-2" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAnonymous"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <FormLabel className="shad-form_label text-sm">
                    {t("createPost.postAnonymously")}
                  </FormLabel>
                  <Input
                    type="checkbox"
                    className="shad-input-checkbox w-4 h-4"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                </div>
              </FormControl>
              <FormMessage className="shad-form_message" />
            </FormItem>
          )}
        />

        <div className="flex gap-4 items-center justify-end">
          <Button
            type="button"
            className="shad-button_dark_4"
            onClick={() => navigate(-1)}
            disabled={isSubmitting || isLoadingCreate}>
            {t("createPost.cancel")}
          </Button>
          {action === "Create" && (
            <Button
              type="button"
              className="shad-button_dark_4"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isLoadingCreate}>
              {isSubmitting || isLoadingCreate ? <Loader /> : t("createPost.saveDraft")}
            </Button>
          )}
          <Button
            type="submit"
            className="shad-button_primary whitespace-nowrap"
            disabled={isSubmitting || isLoadingCreate}>
            {isSubmitting || isLoadingCreate ? (
              <Loader />
            ) : action === "Create" ? (
              t("createPost.viewAndPost")
            ) : (
              t("createPost.updatePost")
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PostForm;
