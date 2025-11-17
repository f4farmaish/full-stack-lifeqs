import { databases } from "@/lib/appwrite/config";
import { appwriteConfig } from "@/lib/appwrite/config";

export const getAllCategories = async () => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.categoriesCollectionId
  );

  return response.documents.map((category: any) => ({
    $id: category.$id,
    name: category.name,
    subCategories: category.subCategories || [],
    name_en: category.name_en || category.name || "",
    name_lat: category.name_lat || category.name || "",
    subcategories_en: category.subcategories_en || category.subCategories || [],
    subcategories_lat:
      category.subcategories_lat || category.subCategories || [],
  }));
};
