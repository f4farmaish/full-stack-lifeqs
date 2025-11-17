import * as z from "zod";
import { Models } from "appwrite";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
import { useCreatePost } from "@/lib/react-query/queries";
import { databases } from "@/lib/appwrite/config";
import { getGroupById } from "@/services/groupService";

type PostFormGroupProps = {
  groupId: string;
  post?: Models.Document;
  action: "Create" | "Update";
};

const PostFormGroup = ({ groupId, post, action }: PostFormGroupProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserContext();
  const [categories, setCategories] = useState<any[]>([]);
  const [, setSubCategories] = useState<string[]>([]);


  // Form configuration
  const form = useForm<z.infer<typeof PostValidation>>({
    resolver: zodResolver(PostValidation),
    defaultValues: {
      title: post?.title || "",
      description: post?.description || "",
      file: [],
      imageUrl: post?.imageUrl || "",
      tags: post?.tags?.join(",") || "",
      categoryId: post?.categoryId || "",
      subCategory: post?.subCategory || "",
    },
    
  });

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const group = await getGroupById(groupId);
  
        if (group) {
          form.setValue("categoryId", group.categoryId?.name || ""); // Nom de la catégorie
          form.setValue("subCategory", group.subCategory.trim());
  
          // Extraire l'ID de categoryId
          const categoryId = group.categoryId?.$id;
  
          if (!categoryId || typeof categoryId !== "string") {
            throw new Error("Invalid category ID format");
          }
  
          const category = await databases.getDocument(
            import.meta.env.VITE_APPWRITE_DATABASE_ID!,
            import.meta.env.VITE_APPWRITE_CATEGORIES_COLLECTION_ID!,
            categoryId // Utilise l'ID correctement extrait
          );
  
  
          setCategories([category]); // Affecter la catégorie principale
          setSubCategories(category.subCategories || []);
        }
      } catch (error) {
        console.error("Failed to load group details:", error);
      }
    };
  
    fetchGroupDetails();
  }, [groupId]);
  


  const { mutateAsync: createPost, isLoading: isLoadingCreate } = useCreatePost();

  const handleSubmit = async (value: z.infer<typeof PostValidation>) => {
    try {
      const payload: any = {
        ...value,
        userId: user.id,
        groupId,
        isAnonymous: value.isAnonymous || false,
        imageUrl: value.imageUrl || null,
        file: value.file && value.file.length > 0 ? value.file : [],
      };


      await createPost(payload);

      toast({ title: "Post created successfully.", variant: "default" });
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error creating group post:", error);
      toast({
        title: "An error occurred.",
        description: error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6 w-full max-w-5xl bg-dark-2 p-6 rounded-lg shadow-md"
      >
      {/* Title Section */}
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="shad-form_label">Question Title</FormLabel>
      <FormControl>
        <Input
          className="shad-input"
          placeholder="A good descriptive title will get more attention. Min 15, Max 150 characters.

"
          {...field}
        />
      </FormControl>
      <FormMessage className="shad-form_message" />
    </FormItem>
  )}
/>

{/* Add Details and Photo Section */}
<div className="flex flex-col md:flex-row gap-6">
  {/* Add Details Section */}
  <div className="flex-1">
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="shad-form_label">Add Details (optional)</FormLabel>
          <FormControl>
            <Textarea
              className="shad-textarea custom-scrollbar h-40" // Larger textarea for more details
              placeholder="You can add details to your question or ask it now without having to add any details. Note: Questions that are enriched with details, created in accordance with spelling rules and added images get more attention! Max 2000 characters."
              {...field}
            />
          </FormControl>
          <FormMessage className="shad-form_message" />
        </FormItem>
      )}
    />
  </div>

  {/* Add Photo Section */}
  <div className="w-full md:w-1/3">
    <FormField
      control={form.control}
      name="file"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="shad-form_label">Add Photo (optional)</FormLabel>
          <FormControl>
            <FileUploader
              fieldChange={(files: File[]) => {
                field.onChange(files);
              }}
              mediaUrl={post?.imageUrl || ""}
            />
          </FormControl>
          <FormMessage className="shad-form_message" />
        </FormItem>
      )}
    />
  </div>
</div>

        

      

{/* Tags */}
<FormField
  control={form.control}
  name="tags"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="shad-form_label">Add Tags (comma-separated, max 5)</FormLabel>
      <FormControl>
        <Input
          type="text"
          className="shad-input"
          {...field}
          placeholder="Art, Expression, Learn"
          onChange={(e) => {
            const value = e.target.value;
            const tags = value.split(",").map((tag) => tag.trim()); // Split by comma and trim whitespace
            if (tags.length <= 5) {
              field.onChange(value); // Allow only up to 5 tags
            } else {
              alert("You can add a maximum of 5 tags."); // Optional: Display an alert for user feedback
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
      <FormLabel>Category</FormLabel>
      <FormControl>
        <Input
          {...field}
          disabled
          className="shad-input"
          value={categories[0]?.name || "Category not found"}
        />
      </FormControl>
    </FormItem>
  )}
/>


<FormField
  control={form.control}
  name="subCategory"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Subcategory</FormLabel>
      <FormControl>
        <Input
          {...field}
          disabled
          className="shad-input"
          value={form.watch("subCategory")}
        />
      </FormControl>
    </FormItem>
  )}
/>


{/* Anonymous Post */}
<FormField
  control={form.control}
  name="isAnonymous"
  render={({ field }) => (
    <FormItem>
      <FormControl>
        <div className="flex items-center space-x-2">
          <FormLabel className="shad-form_label">Post Anonymously</FormLabel>
          <Input
            type="checkbox"
            className="shad-input-checkbox w-4 h-4" /* Make checkbox smaller */
            checked={field.value ?? false}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        </div>
      </FormControl>
      <FormMessage className="shad-form_message" />
    </FormItem>
  )}
/>


        {/* Buttons */}
        <div className="flex gap-4 items-center justify-end">
          <Button
            type="button"
            className="shad-button_dark_4"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="shad-button_primary"
            disabled={isLoadingCreate}
          >
            {isLoadingCreate && <Loader />}
            {action} Post
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PostFormGroup;
