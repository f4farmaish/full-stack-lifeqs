import * as z from "zod";
import { useForm } from "react-hook-form";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useCreatePoll,
  useGetGroupById,
  useGetPollById,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";
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
import { FileUploader, Loader } from "@/components/shared";
import { databases } from "@/lib/appwrite/config";
import { useToast } from "@/components/ui/use-toast";
import { updateUserLevelAndPoints } from "@/services/userService";
import { updatePoll } from "@/services/pollService";
import { UserAction } from "@/lib/pointsMapping";
import { PollValidation } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IPoll } from "@/types";

interface CreatePollPageProps {
  action: "Create" | "Update";
}

// Poll-specific Textarea component with reduced height (50% of original)
// Poll-specific Textarea component with reduced height (50% of original)
const PollOptionTextarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={`flex min-h-[40px] max-h-[95px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 resize-none overflow-y-auto ${className}`}
      {...props}
    />
  );
};

// Poll-specific FileUploader component with minimal UI
const PollOptionFileUploader = ({
  fieldChange,
  mediaUrl,
  deleteImageTitle,
}: {
  fieldChange: (files: File[]) => void;
  mediaUrl: string;
  deleteImageTitle: string;
}) => {
  const [file, setFile] = useState<File[]>([]);
  const [fileUrl, setFileUrl] = useState<string>(mediaUrl);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFile(acceptedFiles);
      fieldChange(acceptedFiles);
      if (acceptedFiles[0]) {
        setFileUrl(URL.createObjectURL(acceptedFiles[0]));
      }
    },
    [fieldChange]
  );

  const handleDeleteImage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setFile([]);
      setFileUrl("");
      fieldChange([]);
    },
    [fieldChange]
  );

  useEffect(() => {
    setFileUrl(mediaUrl);
  }, [mediaUrl]);

  const shouldShowImage =
    fileUrl && (fileUrl.startsWith("blob:") || fileUrl.startsWith("http"));

  return (
    <div
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files) {
            onDrop(Array.from(files));
          }
        };
        input.click();
      }}
      className="flex flex-col bg-dark-3 rounded-xl cursor-pointer h-24 w-full overflow-hidden relative border-2 border-dashed border-gray-400 hover:border-gray-300 transition-colors">
      {shouldShowImage ? (
        <>
          <div className="flex-1 flex justify-center items-center w-full overflow-hidden relative">
            <img
              src={fileUrl}
              alt="Option image"
              className="h-full w-full object-cover"
              onError={() => setFileUrl("")}
            />
            <div className="absolute top-1 right-1">
              <button
                type="button"
                onClick={handleDeleteImage}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                title={deleteImageTitle}>
                ×
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        </div>
      )}
    </div>
  );
};

const CreatePollPage = ({ action }: CreatePollPageProps) => {
  const { t } = useTranslation();
  const { groupId, id: pollId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUserContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createPollMutation = useCreatePoll();
  const { data: group, isLoading: isGroupLoading } = useGetGroupById(groupId);
  const { data: poll, isLoading: isPollLoading } = useGetPollById(pollId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [groupCategory, setGroupCategory] = useState<string | null>(null);
  const [groupSubCategory, setGroupSubCategory] = useState<string | null>(null);
  const [hasDuration, setHasDuration] = useState(false);
  const [optionImages, setOptionImages] = useState<(File | null)[]>([
    null,
    null,
  ]);

  const form = useForm({
    resolver: zodResolver(PollValidation),
    defaultValues: {
      question: "",
      options: ["", ""],
      categoryId: groupCategory || "",
      subCategory: groupSubCategory || "",
      allowMultipleAnswers: false,
      groupId: groupId || null,
      durationInDays: null as number | null,
      file: [],
      description: "",
      isAnonymous: false,
    },
  });

  // Initialize form with poll data in update mode
  useEffect(() => {
    if (action === "Update" && poll && !isPollLoading) {
      form.reset({
        question: poll.question,
        options: poll.options.map((opt) => opt.optionText),
        categoryId: poll.categoryId,
        subCategory: poll.subCategory || "",
        allowMultipleAnswers: poll.allowMultipleAnswers,
        groupId: poll.groupIdString || null,
        durationInDays: poll.durationInDays || null,
        file: [],
        description: poll.description || "",
        isAnonymous: poll.isAnonymous,
      });
      setHasDuration(!!poll.durationInDays);
      setOptionImages(poll.options.map(() => null));
      setGroupCategory(poll.categoryId);
      setGroupSubCategory(poll.subCategory || null);
    }
  }, [action, poll, isPollLoading, form]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        import.meta.env.VITE_APPWRITE_DATABASE_ID!,
        import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID!
      );
      setCategories(response.documents);
    } catch (error) {
      console.error("CreatePollPage: Error loading categories", { error });
      toast({
        title: t("createPoll.failedToLoadCategories"),
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
    if (groupId) {
      databases
        .getDocument(
          import.meta.env.VITE_APPWRITE_DATABASE_ID!,
          import.meta.env.VITE_APPWRITE_GROUPS_COLLECTION_ID!,
          groupId
        )
        .then((group) => {
          const extractedCategoryId =
            typeof group.categoryId === "object"
              ? group.categoryId.$id
              : group.categoryId;
          const extractedSubCategory = group.subCategory || "";
          setGroupCategory(extractedCategoryId);
          setGroupSubCategory(extractedSubCategory);
          form.setValue("categoryId", extractedCategoryId);
          form.setValue("subCategory", extractedSubCategory);
        })
        .catch((error) => {
          console.error("CreatePollPage: Error fetching group data", {
            error,
            groupId,
          });
          toast({
            title: t("createPoll.errorLoadingGroupData"),
            variant: "destructive",
          });
        });
    }
  }, [groupId, fetchCategories, form]);

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

  const addOption = useCallback(() => {
    const options = form.getValues("options");
    if (options.length < 7) {
      // Updated from 5 to 7
      form.setValue("options", [...options, ""]);
      setOptionImages((prev) => [...prev, null]);
    } else {
      toast({
        title: t("createPoll.optionLimitExceeded"),
        variant: "destructive",
      });
    }
  }, [form, toast]);

  const removeOption = useCallback(
    (index: number) => {
      const options = form.getValues("options");
      if (options.length > 2) {
        const updatedOptions = options.filter((_, i) => i !== index);
        form.setValue("options", updatedOptions);
        setOptionImages((prev) => prev.filter((_, i) => i !== index));
      } else {
        toast({
          title: t("createPoll.minOptionsRequired"),
          variant: "destructive",
        });
      }
    },
    [form, toast]
  );

  const updatePollMutation = useMutation({
    mutationFn: (pollData: Partial<IPoll>) => updatePoll(pollId!, pollData),
    onSuccess: (poll) => {
      queryClient.invalidateQueries(["polls"]);
      queryClient.invalidateQueries(["poll", pollId]);
      toast({ description: t("createPoll.pollUpdatedAsDraft") });
      navigate(`/polls/${poll.$id}`);
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      console.error("CreatePollPage: Error updating poll", { error, pollId });
      toast({
        title: `${t("createPoll.failedToUpdatePoll")}: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = useCallback(
    async (data: z.infer<typeof PollValidation>, isDraft: boolean) => {
      if (isSubmitting) return;

      if (!isAuthenticated) {
        toast({
          title: t("createPoll.mustBeLoggedIn"),
          variant: "destructive",
        });
        return;
      }

      if (data.options.some((option: string) => !option.trim())) {
        toast({
          title: t("createPoll.allOptionsMustBeFilled"),
          variant: "destructive",
        });
        return;
      }

      if (data.options.length < 2 || data.options.length > 7) {
        toast({
          title: t("createPoll.pollMustHaveOptions"),
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const pollData = {
          question: data.question,
          options: data.options.map((text: string, index: number) => ({
            optionText: text,
            voteCount:
              action === "Update" ? poll?.options[index]?.voteCount || 0 : 0,
            imageUrl:
              action === "Update"
                ? poll?.options[index]?.imageUrl || null
                : null,
          })),
          categoryId: data.categoryId,
          subCategory: data.subCategory || null,
          creatorId: user.id,
          allowMultipleAnswers: data.allowMultipleAnswers,
          groupId: groupId || null,
          durationInDays: hasDuration ? data.durationInDays ?? null : null,
          file: data.file && data.file.length > 0 ? data.file : [],
          description: data.description || null,
          isAnonymous: data.isAnonymous || false,
          optionImages,
          isDraft: true, // Always create/update as draft for preview
          categoryIdString: data.categoryId,
          categoryName:
            categories.find((cat) => cat.$id === data.categoryId)?.name || "",
          groupIdString: groupId || "",
          groupName: group?.name || "",
        };

        if (action === "Update") {
          updatePollMutation.mutate(pollData);
        } else {
          createPollMutation.mutate(pollData, {
            onSuccess: async (poll) => {
              queryClient.invalidateQueries(["polls"]);
              queryClient.invalidateQueries(["poll", poll.$id]);
              toast({
                description: t("createPoll.pollCreatedAsDraft"),
              });
              navigate(`/polls/${poll.$id}`);
              setIsSubmitting(false);
            },
            onError: (error) => {
              console.error("CreatePollPage: Error creating poll", {
                error,
                groupId,
              });
              toast({
                title: t("createPoll.failedToCreatePoll"),
                variant: "destructive",
              });
              setIsSubmitting(false);
            },
          });
        }
      } catch (error) {
        console.error("CreatePollPage: Submission error", { error, groupId });
        toast({
          title: action === "Update"
            ? t("createPoll.errorUpdatingPoll")
            : t("createPoll.errorCreatingPoll"),
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    },
    [
      action,
      isAuthenticated,
      user.id,
      groupId,
      hasDuration,
      optionImages,
      createPollMutation,
      updatePollMutation,
      form,
      navigate,
      toast,
      categories,
      group?.name,
      poll,
      queryClient,
      pollId,
    ]
  );

  if (action === "Update" && (isPollLoading || !pollId)) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );
  }

  if (action === "Update" && !poll) {
    return (
      <div className="flex-center w-full h-full">
        <p className="text-light-1">{t("createPoll.pollNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="common-container">
        <div className="max-w-5xl flex items-center justify-between w-full mb-4">
          <div className="flex items-center gap-3">
            <img
              src={
                action === "Update"
                  ? "/assets/icons/edit.svg"
                  : "/assets/icons/add-group.svg"
              }
              width={36}
              height={36}
              alt={action === "Update" ? "edit" : "add"}
              className="invert-white"
            />
            <h2 className="h3-bold md:h2-bold text-left">
              {action === "Update"
                ? groupId && group?.name
                  ? `${t("createPoll.editPollIn")} ${group.name}`
                  : t("createPoll.editPoll")
                : groupId && group?.name
                ? `${t("createPoll.createPollIn")} ${group.name}`
                : t("createPoll.createPoll")}
            </h2>
          </div>
          <Link
            to="/my-drafts"
            state={{ groupId: groupId || null, filterFrom: "poll" }}>
            <Button className="shad-button_dark_4">{t("createPoll.myDraftPolls")}</Button>
          </Link>
          {groupId && isGroupLoading && (
            <p className="text-base text-gray-600">{t("createPoll.loadingGroupName")}</p>
          )}
          {groupId && !isGroupLoading && !group && (
            <p className="text-base text-red-500">{t("createPoll.errorLoadingGroupName")}</p>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => handleSubmit(data, false))}
            className="flex flex-col gap-9 w-full max-w-5xl">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2">{t("createPoll.pollQuestion")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("createPoll.pollQuestionPlaceholder")}
                      type="text"
                      className="shad-input"
                      maxLength={150}
                      {...field}
                    />
                  </FormControl>
                  <div className="text-sm text-gray-500 mt-1">
                    {field.value.length}/150
                  </div>
                  <FormMessage />
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
                      <FormLabel className="mb-2">
                        {t("createPoll.addDetails")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className="shad-textarea custom-scrollbar h-40"
                          placeholder={t("createPoll.addDetailsPlaceholder")}
                          maxLength={2000}
                          {...field}
                        />
                      </FormControl>
                      <div className="text-sm text-gray-500 mt-1">
                        {field.value.length}/2000
                      </div>
                      <FormMessage />
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
                      <FormLabel className="mb-2">
                        {t("createPoll.addPhoto")}
                      </FormLabel>
                      <FormControl>
                        <FileUploader
                          fieldChange={(files: File[]) => field.onChange(files)}
                          mediaUrl={
                            action === "Update" ? poll?.imageUrl || "" : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <FormLabel className="mb-2">{t("createPoll.pollOptions")}</FormLabel>

              {form.watch("options").map((option: string, index: number) => (
                <div key={index} className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col md:flex-row items-start gap-4">
                    <div className="flex-1">
                      <FormControl>
                        <PollOptionTextarea
                          value={option}
                          placeholder={`${t("createPoll.option")} ${index + 1}`}
                          className="shad-textarea custom-scrollbar resize-none"
                          maxLength={70} // Updated from 100 to 70
                          onChange={(e) =>
                            form.setValue(
                              "options",
                              form
                                .getValues("options")
                                .map((opt, i) =>
                                  i === index ? e.target.value : opt
                                )
                            )
                          }
                        />
                      </FormControl>
                      <div className="flex justify-between items-center mt-1">
                        <div className="text-sm text-gray-500">
                          {option.length}/70 {/* Updated from 100 to 70 */}
                        </div>
                        {form.watch("options").length > 2 && (
                          <Button
                            type="button"
                            variant="destructive"
                            className="shad-button_destructive"
                            onClick={() => removeOption(index)}>
                            {t("createPoll.remove")}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-1/3">
                      <FormControl>
                        <PollOptionFileUploader
                          fieldChange={(files: File[]) => {
                            setOptionImages((prev) => {
                              const newImages = [...prev];
                              newImages[index] = files[0] || null;
                              return newImages;
                            });
                          }}
                          mediaUrl={
                            action === "Update"
                              ? poll?.options[index]?.imageUrl || ""
                              : ""
                          }
                          deleteImageTitle={t("createPoll.deleteImage")}
                        />
                      </FormControl>
                    </div>
                  </div>
                </div>
              ))}
              {form.watch("options").length < 7 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addOption}
                  className="shad-button_secondary">
                  {t("createPoll.addOption")}
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-2">{t("createPoll.selectCategory")}</FormLabel>
                  <FormControl>
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
                      <option value="" disabled>
                        {groupId
                          ? t("createPoll.categoryAutoSelected")
                          : t("createPoll.selectCategoryOption")}
                      </option>
                      {categories.map((category) => (
                        <option key={category.$id} value={category.$id}>
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
                <FormItem>
                  <FormLabel className="mb-2">{t("createPoll.selectSubcategory")}</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      disabled={!!groupId}
                      className="block w-full px-4 py-3 text-sm text-light-1 bg-dark-3 border border-dark-4 rounded-lg shadow-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition ease-in-out duration-300 hover:bg-dark-4">
                      {groupId ? (
                        <option value={groupSubCategory ?? ""} selected>
                          {groupSubCategory || t("createPoll.noSubcategory")}
                        </option>
                      ) : (
                        <>
                          <option value="" disabled>
                            {t("createPoll.selectSubcategoryOption")}
                          </option>
                          {subCategories.map((subCategory) => (
                            <option key={subCategory} value={subCategory}>
                              {subCategory}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <FormLabel className="mb-2">{t("createPoll.pollDuration")}</FormLabel>
              <div className="flex items-center gap-2 text-light-3">
                <span>{t("createPoll.setExpirationDate")}</span>
                <input
                  type="checkbox"
                  checked={hasDuration}
                  onChange={(e) => setHasDuration(e.target.checked)}
                  className="form-checkbox h-4 w-5 text-primary-600 rounded-lg"
                />
              </div>
              {hasDuration && (
                <FormField
                  control={form.control}
                  name="durationInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={t("createPoll.durationPlaceholder")}
                          min={1}
                          max={30}
                          className="shad-input"
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value
                              ? parseInt(e.target.value, 10)
                              : null;
                            form.setValue("durationInDays", value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="allowMultipleAnswers"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="cursor-pointer">
                      {t("createPoll.allowMultipleAnswers")}
                    </FormLabel>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="form-checkbox h-4 w-5 text-primary-600 rounded-md cursor-pointer"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="cursor-pointer">
                      {t("createPoll.postAnonymously")}
                    </FormLabel>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="form-checkbox h-4 w-5 text-primary-600 rounded-md cursor-pointer"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 items-center justify-end">
              <Button
                type="button"
                className="shad-button_dark_4"
                onClick={() => navigate(-1)}>
                {t("createPoll.cancel")}
              </Button>
              <Button
                type="button"
                className="shad-button_dark_4"
                onClick={form.handleSubmit((data) => handleSubmit(data, true))}
                disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : t("createPoll.saveDraft")}
              </Button>
              <Button
                type="submit"
                className="shad-button_primary"
                disabled={isSubmitting}>
                {isSubmitting ? <Loader /> : t("createPoll.viewAndPost")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreatePollPage;
