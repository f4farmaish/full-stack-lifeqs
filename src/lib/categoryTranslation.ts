import { ICategory } from "@/types";

/**
 * Language type - maps i18n language codes to database field suffixes
 * 'en' (English) -> uses *_en fields
 * 'lv' (Latvian) -> uses *_lat fields (database uses 'lat' suffix)
 */
export type SupportedLanguage = 'en' | 'lv';

/**
 * Get the translated category name based on the current language
 * @param category - The category object from Appwrite
 * @param language - The current language ('en' or 'lv')
 * @returns Translated category name
 *
 * @example
 * const categoryName = getCategoryName(category, 'lv');
 * // Returns "ĢIMENE" for Latvian or "FAMILY" for English
 */
export function getCategoryName(
  category: ICategory,
  language: SupportedLanguage = 'en'
): string {
  if (language === 'lv') {
    // Use Latvian field (name_lat in database)
    return category.name_lat || category.name || '';
  } else {
    // Use English field (name_en in database)
    return category.name_en || category.name || '';
  }
}

/**
 * Get the translated subcategories based on the current language
 * @param category - The category object from Appwrite
 * @param language - The current language ('en' or 'lv')
 * @returns Array of translated subcategory names
 *
 * @example
 * const subcats = getSubcategories(category, 'lv');
 * // Returns ["Grūtniecības plānošana", "Grūtniecības laikā", ...]
 */
export function getSubcategories(
  category: ICategory,
  language: SupportedLanguage = 'en'
): string[] {
  if (language === 'lv') {
    // Use Latvian field (subcategories_lat in database)
    return category.subcategories_lat || category.subCategories || [];
  } else {
    // Use English field (subcategories_en in database)
    return category.subcategories_en || category.subCategories || [];
  }
}

/**
 * Hook-friendly helper to get translated category data
 * Use this with i18n's useTranslation hook
 *
 * @example
 * import { useTranslation } from 'react-i18next';
 * import { getTranslatedCategory } from '@/lib/categoryTranslation';
 *
 * const { i18n } = useTranslation();
 * const translatedCategory = getTranslatedCategory(category, i18n.language);
 */
export function getTranslatedCategory(
  category: ICategory,
  language: string
): {
  name: string;
  subcategories: string[];
} {
  const lang = (language.startsWith('lv') ? 'lv' : 'en') as SupportedLanguage;

  return {
    name: getCategoryName(category, lang),
    subcategories: getSubcategories(category, lang),
  };
}

/**
 * React hook to get translated category data
 * Automatically uses the current i18n language
 *
 * @example
 * import { useTranslatedCategory } from '@/lib/categoryTranslation';
 *
 * const MyComponent = ({ category }) => {
 *   const { name, subcategories } = useTranslatedCategory(category);
 *
 *   return (
 *     <div>
 *       <h1>{name}</h1>
 *       <ul>
 *         {subcategories.map(sub => <li key={sub}>{sub}</li>)}
 *       </ul>
 *     </div>
 *   );
 * };
 */
export function useTranslatedCategory(category: ICategory) {
  // This will be imported from react-i18next in your components
  // For now, we'll provide a standalone version
  const language = typeof window !== 'undefined'
    ? localStorage.getItem('i18nextLng') || 'en'
    : 'en';

  return getTranslatedCategory(category, language);
}
