# Technical Implementation Summary: Multi-Language Categories

## Overview

This document provides a technical summary of the multi-language category system implementation for developers and maintainers.

---

## Architecture

### Database Schema (Appwrite)

**Collection:** `Categories`

```typescript
interface CategoryDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;

  // Legacy fields (kept for backward compatibility)
  name: string;                 // English
  subCategories: string[];      // English

  // Translation fields
  name_en: string;              // English display
  name_lat: string;             // Latvian display
  subcategories_en: string[];   // English subcategories
  subcategories_lat: string[];  // Latvian subcategories
}
```

---

## Implementation Details

### 1. Data Layer

**File:** `src/services/categoryService.ts`

```typescript
export const getAllCategories = async () => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.categoriesCollectionId
  );

  return response.documents.map((category: any) => ({
    $id: category.$id,
    name: category.name,
    subCategories: category.subCategories || [],
    // Translation fields
    name_en: category.name_en || category.name || '',
    name_lat: category.name_lat || category.name || '',
    subcategories_en: category.subcategories_en || category.subCategories || [],
    subcategories_lat: category.subcategories_lat || category.subCategories || [],
  }));
};
```

**Key Points:**
- Fetches all translation fields from database
- Provides fallbacks to legacy fields
- Returns strongly-typed objects

---

### 2. Type Definitions

**File:** `src/types/index.ts`

```typescript
export type ICategory = {
  $id: string;
  name: string;                 // Legacy
  subCategories: string[];      // Legacy
  name_en: string;
  name_lat: string;
  subcategories_en: string[];
  subcategories_lat: string[];
  icon?: JSX.Element;
};
```

---

### 3. Translation Helpers

**File:** `src/lib/categoryTranslation.ts`

```typescript
export type SupportedLanguage = 'en' | 'lv';

export function getCategoryName(
  category: ICategory,
  language: SupportedLanguage = 'en'
): string {
  if (language === 'lv') {
    return category.name_lat || category.name || '';
  }
  return category.name_en || category.name || '';
}

export function getSubcategories(
  category: ICategory,
  language: SupportedLanguage = 'en'
): string[] {
  if (language === 'lv') {
    return category.subcategories_lat || category.subCategories || [];
  }
  return category.subcategories_en || category.subCategories || [];
}
```

**Design Decisions:**
- Simple if/else for two languages (not over-engineered)
- Fallback chain: `translated → legacy → empty`
- Direct property access (TypeScript type-safe)

---

### 4. UI Component

**File:** `src/components/shared/TopicsList.tsx`

**Key Implementation:**

```typescript
const TopicsList: React.FC<TopicsListProps> = ({ ... }) => {
  const { data: rawCategories = [], isLoading } = useCategories();
  const { i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('lv') ? 'lv' : 'en';

  // For display - use current language
  const activeCategoryName = getCategoryName(activeCategory, currentLang);
  const activeSubcategoriesDisplay = getSubcategories(activeCategory, currentLang);

  // For filtering - always use English
  const activeSubcategoriesEnglish = getSubcategories(activeCategory, 'en');

  // Render
  return (
    <button onClick={() => {
      // Send English value for database query
      setSelectedCategory(categoryId, [subCategoryEnglish]);
    }}>
      {/* Display translated value */}
      <span>{subCategoryDisplay}</span>
    </button>
  );
};
```

**Flow:**
1. Fetch categories from database (with all translations)
2. Detect user's language from i18n
3. Display translated category/subcategory names
4. On click: send English value to API
5. Database filters using English value
6. Results returned and displayed in user's language

---

### 5. Cache Management

**File:** `src/_root/pages/Home.tsx`

```typescript
const Home = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.state?.categoryId || location.state?.subCategory) {
      setSelectedCategoryId(categoryId);
      setSubCategories(subCategory);

      // Clear cache to prevent cursor errors
      queryClient.invalidateQueries({ queryKey: ["combinedContent"] });
    }
  }, [location.state, queryClient]);
};
```

**Why:** Prevents Appwrite cursor pagination errors when switching categories

---

## Data Flow Diagram

```
User Action
    ↓
1. User clicks "Grūtniecības plānošana" (Latvian subcategory)
    ↓
2. TopicsList maps to English: "Planning pregnancy"
    ↓
3. setSelectedCategory(categoryId, ["Planning pregnancy"])
    ↓
4. API query: WHERE subCategory = "Planning pregnancy"
    ↓
5. Database returns matching posts
    ↓
6. Posts displayed with UI in user's language
```

---

## Language Mapping

| i18n Code | Database Suffix | Display Name |
|-----------|----------------|--------------|
| `en` | `_en` | English |
| `lv` | `_lat` | Latvian (Latviešu) |

**Note:** Database uses `_lat` suffix (not `_lv`) for Latvian fields.

---

## React Query Configuration

```typescript
export const useFetchCombinedContent = ({ categoryId, subCategory, ... }) => {
  return useInfiniteQuery({
    queryKey: ["combinedContent", categoryId, subCategory, ...],
    queryFn: ({ pageParam }) => fetchCombinedContent({ ... }),
    getNextPageParam: (lastPage) => {
      // Cursor-based pagination
      return lastPage.documents[lastPage.documents.length - 1].$id;
    },
    staleTime: 1000 * 60 * 10,  // 10 min
    cacheTime: 1000 * 60 * 30,   // 30 min
    refetchOnWindowFocus: false,
  });
};
```

---

## Important Constraints

### 1. Array Order Matters
```typescript
// ✅ CORRECT
subcategories_en:  ["A", "B", "C"]
subcategories_lat: ["A_lat", "B_lat", "C_lat"]

// ❌ WRONG
subcategories_en:  ["A", "B", "C"]
subcategories_lat: ["B_lat", "C_lat", "A_lat"]
```

**Why:** UI code maps by index (`activeSubcategoriesDisplay[index]` → `activeSubcategoriesEnglish[index]`)

### 2. English Values are Immutable
- Posts store English subcategory values
- Changing English values breaks post filtering
- Only display translations can be updated

### 3. Fallback Chain Required
```typescript
// Always provide fallbacks
category.name_en || category.name || ''
```

**Why:** Handles legacy data and missing translations gracefully

---

## Testing Scenarios

### Test 1: Language Switch
1. Set language to English → verify categories show in English
2. Switch to Latvian → verify categories show in Latvian
3. Click category → verify posts load correctly

### Test 2: Filtering
1. Select Latvian subcategory "Grūtniecības plānošana"
2. Verify API receives English: "Planning pregnancy"
3. Verify correct posts are displayed

### Test 3: Cache Invalidation
1. Select category A
2. Switch to category B
3. Verify no cursor errors
4. Verify fresh data loads

### Test 4: Fallbacks
1. Create category with only `name` (no `name_en`)
2. Verify it displays using fallback
3. Add `name_en` → verify it uses new value

---

## Adding New Languages (Future)

To add a third language (e.g., Russian):

### 1. Database
Add fields to Categories collection:
- `name_ru`
- `subcategories_ru`

### 2. Types
```typescript
export type ICategory = {
  // ... existing fields
  name_ru?: string;
  subcategories_ru?: string[];
};
```

### 3. Translation Helper
```typescript
export type SupportedLanguage = 'en' | 'lv' | 'ru';

export function getCategoryName(
  category: ICategory,
  language: SupportedLanguage = 'en'
): string {
  if (language === 'lv') return category.name_lat || category.name || '';
  if (language === 'ru') return category.name_ru || category.name || '';
  return category.name_en || category.name || '';
}
```

### 4. Service
```typescript
return response.documents.map((category: any) => ({
  // ... existing fields
  name_ru: category.name_ru || category.name || '',
  subcategories_ru: category.subcategories_ru || category.subCategories || [],
}));
```

---

## Performance Considerations

### Caching Strategy
- **Categories**: 10 min stale, 30 min cache (rarely change)
- **Posts**: 10 min stale, 30 min cache (invalidated on category change)
- **No refetch on window focus** (reduce API calls)

### Optimization Opportunities
1. **Lazy load translations**: Only fetch needed language
2. **CDN caching**: Static category data
3. **Service Worker**: Offline category access

---

## Security Considerations

### Input Validation
- Category names: sanitize before display (XSS prevention)
- Subcategories: validate against whitelist before query
- No user-generated category content (admin-only)

### Query Injection
- Appwrite handles query escaping
- Always use query builder, never string concat
- Validate categoryId format (Appwrite ID pattern)

---

## Debugging Tips

### Check Translation Loading
```typescript
console.log('Category data:', category);
console.log('Current language:', currentLang);
console.log('Name EN:', category.name_en);
console.log('Name LAT:', category.name_lat);
```

### Verify Query Parameters
```typescript
console.log('Selected category ID:', selectedCategoryId);
console.log('Selected subcategory (EN):', subCategoryEnglish);
console.log('Displayed subcategory:', subCategoryDisplay);
```

### React Query DevTools
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In App.tsx
<ReactQueryDevtools initialIsOpen={false} />
```

---

## Files Modified

1. ✅ `src/types/index.ts` - Added translation fields to ICategory
2. ✅ `src/services/categoryService.ts` - Fetch translation fields
3. ✅ `src/lib/categoryTranslation.ts` - Helper functions (NEW)
4. ✅ `src/hooks/useTranslatedCategory.ts` - React hook (NEW)
5. ✅ `src/components/shared/TopicsList.tsx` - Display translations
6. ✅ `src/_root/pages/Home.tsx` - Cache invalidation

---

## Migration Notes

### Backward Compatibility
- Legacy `name` and `subCategories` fields preserved
- Existing posts continue to work
- Gradual translation rollout possible

### Data Migration
All existing categories were bulk-updated with:
- English values copied to `*_en` fields
- Latvian translations added to `*_lat` fields
- Legacy fields kept unchanged

---

## Known Issues & Limitations

1. **Two languages only**: System designed for EN/LV pair
2. **Admin translation**: No UI for editing translations (Appwrite console only)
3. **Index mapping**: Subcategories must be in same order across languages
4. **Case sensitive**: "Planning pregnancy" ≠ "planning pregnancy"

---

## Future Enhancements

1. **Admin panel**: UI for managing category translations
2. **Translation API**: Automatic translation suggestions
3. **Version control**: Track translation changes
4. **Analytics**: Track which subcategories are most used per language

---

**Last Updated:** October 2025
**Maintainer:** Development Team
**Version:** 1.0
