import { useTranslation } from 'react-i18next';
import { ICategory } from '@/types';
import { getTranslatedCategory } from '@/lib/categoryTranslation';

/**
 * React hook to get translated category data
 * Automatically uses the current i18n language and updates when language changes
 *
 * @param category - The category object from Appwrite
 * @returns Object with translated name and subcategories
 *
 * @example
 * import { useTranslatedCategory } from '@/hooks/useTranslatedCategory';
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
  const { i18n } = useTranslation();

  return getTranslatedCategory(category, i18n.language);
}
