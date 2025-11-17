# Translation Guide for Lifeqs

This document explains how the translation system works in the Lifeqs application and provides step-by-step instructions for translating new content.

## Table of Contents
1. [Overview](#overview)
2. [How Translation Works](#how-translation-works)
3. [Translation File Structure](#translation-file-structure)
4. [Translating UI Components](#translating-ui-components)
5. [Translating Database Content (Appwrite)](#translating-database-content-appwrite)
6. [Best Practices](#best-practices)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

Lifeqs uses **React i18next** for internationalization (i18n). The application currently supports:
- **English (en)** - Default language
- **Latvian (lv)** - Secondary language

All UI text, labels, buttons, messages, and error notifications can be translated through JSON files.

---

## How Translation Works

### Technology Stack
- **Library**: `react-i18next`
- **Translation Files**: Located in `src/i18n/locales/`
  - `en.json` - English translations
  - `lv.json` - Latvian translations

### Translation Hook
Components use the `useTranslation()` hook to access translations:

```tsx
import { useTranslation } from "react-i18next";

const MyComponent = () => {
  const { t } = useTranslation();

  return <h1>{t("common.welcome")}</h1>;
};
```

### Translation Key Structure
Translation keys follow a hierarchical structure:
```
section.subsection.key
```

Example:
```json
{
  "profile": {
    "posts": "Posts",
    "settings": "Settings"
  }
}
```

Access with: `t("profile.posts")`

---

## Translation File Structure

### Current Sections in Translation Files

```
src/i18n/locales/
├── en.json
│   ├── common          # Global elements (buttons, navigation)
│   ├── navigation      # Navigation menu items
│   ├── search          # Search functionality
│   ├── comments        # Comment-related text
│   ├── groups          # Group management
│   ├── posts           # Post-related text
│   ├── createPost      # Create/Edit post page
│   ├── createPoll      # Create/Edit poll page
│   ├── profile         # Profile page
│   ├── updateProfile   # Update profile form
│   ├── footer          # Footer bar
│   └── ...
└── lv.json (same structure as en.json)
```

---

## Translating UI Components

Follow these steps to translate a component that isn't translated yet:

### Step 1: Identify Hardcoded Text

Look for hardcoded strings in the component:

❌ **Before (Not Translated):**
```tsx
const MyComponent = () => {
  return (
    <div>
      <h1>Welcome to Lifeqs</h1>
      <button>Create Post</button>
    </div>
  );
};
```

### Step 2: Add Translation Keys to JSON Files

Add the keys to **both** `en.json` and `lv.json`:

**en.json:**
```json
{
  "mySection": {
    "welcome": "Welcome to Lifeqs",
    "createPost": "Create Post"
  }
}
```

**lv.json:**
```json
{
  "mySection": {
    "welcome": "Laipni lūdzam Lifeqs",
    "createPost": "Izveidot ierakstu"
  }
}
```

### Step 3: Update the Component

✅ **After (Translated):**
```tsx
import { useTranslation } from "react-i18next";

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("mySection.welcome")}</h1>
      <button>{t("mySection.createPost")}</button>
    </div>
  );
};
```

### Step 4: Test the Translation

1. Run the application
2. Switch between English and Latvian using the language selector
3. Verify that all text changes correctly

---

## Special Cases

### 1. Dynamic Text with Variables

Use interpolation for dynamic content:

**Translation files:**
```json
{
  "greeting": "Hello, {{name}}!"
}
```

**Component:**
```tsx
<p>{t("greeting", { name: user.name })}</p>
```

### 2. Pluralization

For text that changes based on count:

**Translation files:**
```json
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}
```

**Component:**
```tsx
<p>{t("items", { count: itemCount })}</p>
```

### 3. Conditional Text

For different messages based on action:

```tsx
const message = action === "Create"
  ? t("createPost.viewAndPost")
  : t("createPost.updatePost");
```

### 4. Placeholders and Inputs

```tsx
<Input
  placeholder={t("createPost.questionTitlePlaceholder")}
  maxLength={150}
/>
```

### 5. Toast Notifications

```tsx
toast({
  title: t("createPost.errorOccurred"),
  description: t("createPost.somethingWentWrong"),
  variant: "destructive",
});
```

---

## Translating Database Content (Appwrite)

Some content is stored in Appwrite and needs special handling for translation.

### Current Approach: Multi-Field Storage

For database content that needs translation (like categories, group descriptions, etc.):

#### Method 1: Store Multiple Language Fields

**Appwrite Collection Structure:**
```
Categories Collection:
- name_en (string)     # English name
- name_lv (string)     # Latvian name
- description_en (text)
- description_lv (text)
```

**Implementation:**
```tsx
import { useTranslation } from "react-i18next";

const CategoryDisplay = ({ category }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language; // 'en' or 'lv'

  const categoryName = category[`name_${currentLang}`] || category.name_en;

  return <h2>{categoryName}</h2>;
};
```

#### Method 2: Separate Translation Collection

**Appwrite Collections:**

1. **Main Collection (e.g., Categories):**
```
- id
- slug (unique identifier)
- image
- createdAt
```

2. **Translations Collection:**
```
- id
- entityId (reference to main collection)
- entityType ("category", "group", etc.)
- language ("en", "lv")
- name
- description
```

**Implementation:**
```tsx
const fetchCategoryWithTranslation = async (categoryId, language) => {
  // Fetch main category
  const category = await databases.getDocument(
    DATABASE_ID,
    CATEGORIES_COLLECTION_ID,
    categoryId
  );

  // Fetch translation
  const translations = await databases.listDocuments(
    DATABASE_ID,
    TRANSLATIONS_COLLECTION_ID,
    [
      Query.equal('entityId', categoryId),
      Query.equal('entityType', 'category'),
      Query.equal('language', language)
    ]
  );

  return {
    ...category,
    name: translations.documents[0]?.name || category.name,
    description: translations.documents[0]?.description || category.description
  };
};
```

### Steps to Add Translation to Existing Database Content

#### 1. Update Appwrite Collection Schema

Add language-specific fields to your collection:

**Using Appwrite Console:**
1. Go to your Appwrite project
2. Navigate to Databases → Your Database → Your Collection
3. Click "Attributes"
4. Add new attributes:
   - Attribute Key: `name_lv` (for Latvian)
   - Type: String
   - Size: 255
   - Required: No (optional)

Repeat for other fields like `description_lv`, etc.

#### 2. Migrate Existing Data

Create a migration script or manually update existing records:

```typescript
// migration-script.ts
import { databases } from "@/lib/appwrite/config";

const migrateCategories = async () => {
  // Fetch all categories
  const categories = await databases.listDocuments(
    DATABASE_ID,
    CATEGORIES_COLLECTION_ID
  );

  // Update each category with Latvian translations
  for (const category of categories.documents) {
    await databases.updateDocument(
      DATABASE_ID,
      CATEGORIES_COLLECTION_ID,
      category.$id,
      {
        name_en: category.name, // Keep existing as English
        name_lv: "Latviešu nosaukums", // Add Latvian
        description_en: category.description,
        description_lv: "Latviešu apraksts"
      }
    );
  }
};
```

#### 3. Update Service Functions

Modify your service functions to use the correct language field:

**Before:**
```typescript
export const getCategories = async () => {
  const response = await databases.listDocuments(
    DATABASE_ID,
    CATEGORIES_COLLECTION_ID
  );
  return response.documents;
};
```

**After:**
```typescript
export const getCategories = async (language = 'en') => {
  const response = await databases.listDocuments(
    DATABASE_ID,
    CATEGORIES_COLLECTION_ID
  );

  return response.documents.map(category => ({
    ...category,
    name: category[`name_${language}`] || category.name_en,
    description: category[`description_${language}`] || category.description_en
  }));
};
```

#### 4. Update Components

```tsx
import { useTranslation } from "react-i18next";

const CategoryList = () => {
  const { i18n } = useTranslation();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await getCategories(i18n.language);
      setCategories(data);
    };

    fetchCategories();
  }, [i18n.language]); // Re-fetch when language changes

  return (
    <div>
      {categories.map(category => (
        <div key={category.$id}>
          <h3>{category.name}</h3>
          <p>{category.description}</p>
        </div>
      ))}
    </div>
  );
};
```

### User-Generated Content

For user-generated content (posts, comments, etc.), **do not translate**. Users write in their preferred language, and the content should remain as-is.

**Only translate:**
- ✅ UI labels and buttons
- ✅ System messages and errors
- ✅ Categories and predefined options
- ✅ Navigation and menus
- ❌ User posts, comments, or bios

---

## Best Practices

### 1. **Consistent Key Naming**
Use clear, descriptive key names:
```
✅ createPost.questionTitle
❌ cp.qt
```

### 2. **Group Related Keys**
Keep related translations together:
```json
{
  "createPost": {
    "title": "Create Post",
    "saveDraft": "Save Draft",
    "cancel": "Cancel"
  }
}
```

### 3. **Avoid Hardcoded Text**
Never use hardcoded text for user-facing content:
```tsx
❌ <button>Cancel</button>
✅ <button>{t("common.cancel")}</button>
```

### 4. **Default to English**
If a translation is missing, it will fall back to English automatically.

### 5. **Context Matters**
Add context to key names when the same word has different meanings:
```json
{
  "post_verb": "Post",        // Action (verb)
  "post_noun": "Post"         // Content (noun)
}
```

### 6. **Keep Translations Short for Buttons**
UI space is limited, especially for buttons:
```json
✅ "save": "Save"
❌ "save": "Save this information to your account"
```

### 7. **Test Both Languages**
Always test the UI in both languages to ensure:
- Text fits in UI components
- No layout issues
- All translations are correct

---

## Common Issues & Solutions

### Issue 1: Translation Key Not Found
**Error:** `Missing translation key: "profile.bio"`

**Solution:**
1. Check if the key exists in both `en.json` and `lv.json`
2. Ensure the key path is correct (case-sensitive)
3. Restart the dev server if you just added the key

### Issue 2: Translation Not Updating
**Solution:**
1. Clear browser cache
2. Check if `useTranslation()` is imported
3. Verify the translation key is spelled correctly

### Issue 3: Text Not Changing When Language Switches
**Solution:**
1. Ensure the component is using `t()` function
2. Check if the component re-renders on language change
3. For computed values, use `useMemo` with `i18n.language` as dependency:

```tsx
const message = useMemo(() =>
  t("welcome", { name: user.name }),
  [t, user.name, i18n.language]
);
```

### Issue 4: Appwrite Database Fields Not Showing Translated Content
**Solution:**
1. Verify language-specific fields exist in Appwrite collection
2. Check if the service function is using the correct language parameter
3. Ensure `i18n.language` is passed to the service function

### Issue 5: JSON Syntax Errors
**Error:** Translation file won't load

**Solution:**
1. Validate JSON syntax (use a JSON validator)
2. Check for missing commas or quotes
3. Ensure no trailing commas in objects

---

## Quick Reference: Translation Checklist

When adding translations to a new component:

- [ ] Import `useTranslation` hook
- [ ] Add `const { t } = useTranslation();`
- [ ] Add translation keys to `en.json`
- [ ] Add translation keys to `lv.json`
- [ ] Replace hardcoded text with `t("key")`
- [ ] Test in English
- [ ] Test in Latvian
- [ ] Check for layout issues
- [ ] Verify all edge cases (errors, empty states, etc.)

---

## Example: Complete Translation Flow

Let's translate a complete component from scratch:

### 1. Original Component (Not Translated)
```tsx
// src/components/UserCard.tsx
const UserCard = ({ user }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    if (!user) {
      alert("Please log in to follow users");
      return;
    }
    setIsFollowing(!isFollowing);
  };

  return (
    <div>
      <img src={user.imageUrl} alt="Profile" />
      <h3>{user.name}</h3>
      <p>{user.followers} followers</p>
      <button onClick={handleFollow}>
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
};
```

### 2. Add Keys to Translation Files

**en.json:**
```json
{
  "userCard": {
    "followers": "{{count}} followers",
    "followers_singular": "{{count}} follower",
    "follow": "Follow",
    "unfollow": "Unfollow",
    "loginToFollow": "Please log in to follow users",
    "profileAlt": "Profile picture"
  }
}
```

**lv.json:**
```json
{
  "userCard": {
    "followers": "{{count}} sekotāji",
    "followers_singular": "{{count}} sekotājs",
    "follow": "Sekot",
    "unfollow": "Atsekot",
    "loginToFollow": "Lūdzu, piesakieties, lai sekotu lietotājiem",
    "profileAlt": "Profila attēls"
  }
}
```

### 3. Updated Component (Translated)
```tsx
// src/components/UserCard.tsx
import { useTranslation } from "react-i18next";

const UserCard = ({ user }) => {
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(false);

  const handleFollow = () => {
    if (!user) {
      toast({
        title: t("userCard.loginToFollow"),
        variant: "destructive"
      });
      return;
    }
    setIsFollowing(!isFollowing);
  };

  return (
    <div>
      <img
        src={user.imageUrl}
        alt={t("userCard.profileAlt")}
      />
      <h3>{user.name}</h3>
      <p>{t("userCard.followers", { count: user.followers })}</p>
      <button onClick={handleFollow}>
        {isFollowing
          ? t("userCard.unfollow")
          : t("userCard.follow")
        }
      </button>
    </div>
  );
};
```

---

## File Locations Reference

```
src/
├── i18n/
│   ├── locales/
│   │   ├── en.json          # English translations
│   │   └── lv.json          # Latvian translations
│   └── i18n.ts              # i18n configuration
├── components/
│   ├── forms/
│   │   ├── PostForm.tsx     # Uses createPost translations
│   │   └── ...
│   └── shared/
│       ├── InformativeBottomBar.tsx  # Uses footer translations
│       └── ...
└── _root/
    └── pages/
        ├── CreatePost.tsx        # Uses createPost translations
        ├── CreatePollPage.tsx    # Uses createPoll translations
        ├── Profile.tsx           # Uses profile translations
        └── ...
```

---

## Support & Resources

- **React i18next Documentation**: https://react.i18next.com/
- **Appwrite Documentation**: https://appwrite.io/docs
- **Project Translation Files**: `src/i18n/locales/`

---

## Summary

1. **UI Translation**: Add keys to JSON files and use `t()` function
2. **Database Translation**: Add language-specific fields in Appwrite and update service functions
3. **Always test both languages** before deploying
4. **Keep translations organized** by grouping related keys
5. **Never translate user-generated content**

For questions or issues, refer to this guide or consult the development team.
