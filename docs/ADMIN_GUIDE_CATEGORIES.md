# Admin Guide: Adding Categories & Subcategories

This guide explains how to add new categories and subcategories to Lifeqs with multi-language support (English and Latvian).

## Table of Contents
- [Overview](#overview)
- [Adding a New Category](#adding-a-new-category)
- [Adding Subcategories](#adding-subcategories)
- [Language Requirements](#language-requirements)
- [Step-by-Step Instructions](#step-by-step-instructions)
- [Examples](#examples)
- [Important Notes](#important-notes)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Lifeqs platform supports **bilingual categories**:
- **English** (`en`) - Used for database queries and filtering
- **Latvian** (`lv/lat`) - Used for display to Latvian users

### How It Works
- **Display**: Categories show in the user's selected language
- **Database**: All queries and filters use English values
- **Storage**: Both languages are stored in Appwrite

---

## Language Requirements

Each category and subcategory must have **BOTH** language versions:

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Legacy field (English) | "FAMILY" |
| `name_en` | English display name | "FAMILY" |
| `name_lat` | Latvian display name | "ĢIMENE" |
| `subCategories` | Legacy field (English) | ["Planning pregnancy", "During pregnancy"] |
| `subcategories_en` | English subcategories | ["Planning pregnancy", "During pregnancy"] |
| `subcategories_lat` | Latvian subcategories | ["Grūtniecības plānošana", "Grūtniecības laikā"] |

---

## Adding a New Category

### Step 1: Access Appwrite Console
1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Login with admin credentials
3. Navigate to **Database** → **lifeqs-db** → **Categories Collection**

### Step 2: Create New Document
Click **"Create Document"** button

### Step 3: Fill Required Fields

#### Basic Fields:
```yaml
$id: (auto-generated)
name: "CATEGORY NAME IN ENGLISH"
name_en: "CATEGORY NAME IN ENGLISH"
name_lat: "KATEGORIJAS NOSAUKUMS LATVISKI"
```

#### Subcategories Fields:
```yaml
subCategories:
  - "English Subcategory 1"
  - "English Subcategory 2"
  - "English Subcategory 3"

subcategories_en:
  - "English Subcategory 1"
  - "English Subcategory 2"
  - "English Subcategory 3"

subcategories_lat:
  - "Latviešu apakškategorija 1"
  - "Latviešu apakškategorija 2"
  - "Latviešu apakškategorija 3"
```

### Step 4: Save
Click **"Create"** to save the category

---

## Step-by-Step Instructions

### Complete Example: Adding "TRAVEL" Category

#### 1. Open Appwrite Categories Collection

#### 2. Click "Create Document"

#### 3. Fill in the fields:

**Document ID:**
```
(Leave empty - auto-generated)
```

**name:**
```
TRAVEL
```

**name_en:**
```
TRAVEL
```

**name_lat:**
```
CEĻOŠANA
```

**subCategories (Array):**
```json
[
  "International Travel",
  "Domestic Travel",
  "Travel Planning",
  "Travel Safety"
]
```

**subcategories_en (Array):**
```json
[
  "International Travel",
  "Domestic Travel",
  "Travel Planning",
  "Travel Safety"
]
```

**subcategories_lat (Array):**
```json
[
  "Starptautiskie ceļojumi",
  "Vietējie ceļojumi",
  "Ceļojumu plānošana",
  "Ceļošanas drošība"
]
```

#### 4. Click "Create"

---

## Examples

### Example 1: Technology Category

```json
{
  "name": "TECHNOLOGY",
  "name_en": "TECHNOLOGY",
  "name_lat": "TEHNOLOĢIJA",
  "subCategories": [
    "Software & Apps",
    "Hardware & Gadgets",
    "Internet & Networks",
    "AI & Automation"
  ],
  "subcategories_en": [
    "Software & Apps",
    "Hardware & Gadgets",
    "Internet & Networks",
    "AI & Automation"
  ],
  "subcategories_lat": [
    "Programmatūra un lietotnes",
    "Aparatūra un ierīces",
    "Internets un tīkli",
    "AI un automatizācija"
  ]
}
```

### Example 2: Food Category

```json
{
  "name": "FOOD & COOKING",
  "name_en": "FOOD & COOKING",
  "name_lat": "ĒDIENI UN GATAVOŠANA",
  "subCategories": [
    "Recipes",
    "Restaurants & Cafes",
    "Nutrition",
    "Baking"
  ],
  "subcategories_en": [
    "Recipes",
    "Restaurants & Cafes",
    "Nutrition",
    "Baking"
  ],
  "subcategories_lat": [
    "Receptes",
    "Restorāni un kafejnīcas",
    "Uzturs",
    "Ceptuve"
  ]
}
```

---

## Adding Subcategories to Existing Category

### Step 1: Find the Category
1. Open Appwrite Categories Collection
2. Search for the category you want to edit
3. Click on the document

### Step 2: Edit Subcategories
Add new subcategories to **ALL THREE** arrays:

**Before:**
```json
{
  "subCategories": ["Existing 1", "Existing 2"],
  "subcategories_en": ["Existing 1", "Existing 2"],
  "subcategories_lat": ["Esošais 1", "Esošais 2"]
}
```

**After:**
```json
{
  "subCategories": ["Existing 1", "Existing 2", "New Subcategory"],
  "subcategories_en": ["Existing 1", "Existing 2", "New Subcategory"],
  "subcategories_lat": ["Esošais 1", "Esošais 2", "Jauna apakškategorija"]
}
```

### Step 3: Update
Click **"Update"** to save changes

---

## Important Notes

### ✅ DO:
- ✅ Always provide **BOTH** English and Latvian translations
- ✅ Keep array lengths **IDENTICAL** (same number of subcategories in both languages)
- ✅ Use **UPPERCASE** for category names (e.g., "FAMILY" not "family")
- ✅ Use **Title Case** for subcategories (e.g., "Planning pregnancy")
- ✅ Keep English values in `name` and `subCategories` for backward compatibility

### ❌ DON'T:
- ❌ Leave translation fields empty
- ❌ Have different numbers of subcategories in EN vs LAT arrays
- ❌ Use special characters that break queries (like quotes, backslashes)
- ❌ Change existing English subcategory names (this breaks post filters)

---

## Translation Tips

### Getting Latvian Translations

#### Option 1: Use Google Translate
1. Go to [Google Translate](https://translate.google.com)
2. Select: English → Latvian
3. Translate your category/subcategory name
4. **Review**: Check if translation makes sense

#### Option 2: Professional Translation
For official/public categories, consider professional translation services.

### Common Translations Reference

| English | Latvian |
|---------|---------|
| Planning | Plānošana |
| Health | Veselība |
| Education | Izglītība |
| Work | Darbs |
| Family | Ģimene |
| Friends | Draugi |
| Money | Nauda |
| Travel | Ceļošana |
| Food | Ēdiens |
| Home | Mājas |
| Beauty | Skaistums |
| Sports | Sports |
| Technology | Tehnoloģija |
| Entertainment | Izklaide |

---

## Troubleshooting

### Problem: Category doesn't appear on the website
**Solution:**
1. Check if all required fields are filled
2. Verify the category has at least one subcategory
3. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
4. Wait 10 minutes for cache to invalidate

### Problem: Category shows in English even when Latvian is selected
**Solution:**
1. Verify `name_lat` field is filled
2. Check for typos in field name (must be exactly `name_lat`)
3. Make sure value is not empty or null

### Problem: Subcategories don't match between languages
**Solution:**
1. Count items in `subcategories_en` array
2. Count items in `subcategories_lat` array
3. Ensure they have the **same number** of items
4. Ensure they are in the **same order**

### Problem: Posts not filtering correctly
**Solution:**
- The English value must **exactly match** what's stored in posts
- Check existing posts to see the exact subcategory spelling
- Don't change English values for existing categories

---

## Quick Reference Checklist

When adding a new category, ensure:

- [ ] `name` is filled (English, UPPERCASE)
- [ ] `name_en` is filled (English, UPPERCASE)
- [ ] `name_lat` is filled (Latvian, UPPERCASE)
- [ ] `subCategories` array has items (English)
- [ ] `subcategories_en` array has items (English)
- [ ] `subcategories_lat` array has items (Latvian)
- [ ] All three subcategory arrays have the **same length**
- [ ] All three subcategory arrays are in the **same order**
- [ ] Translations are accurate and meaningful
- [ ] No spelling errors or typos

---

## Database Fields Reference

### Full Field Specification

```typescript
{
  $id: string;                  // Auto-generated by Appwrite
  $createdAt: string;          // Auto-generated by Appwrite
  $updatedAt: string;          // Auto-generated by Appwrite

  // REQUIRED FIELDS
  name: string;                // English name (legacy)
  name_en: string;             // English name
  name_lat: string;            // Latvian name
  subCategories: string[];     // English subcategories (legacy)
  subcategories_en: string[];  // English subcategories
  subcategories_lat: string[]; // Latvian subcategories
}
```

### Example Document Structure

```json
{
  "$id": "68a31e4a003571264718",
  "$createdAt": "2025-08-18T12:36:26.794+00:00",
  "$updatedAt": "2025-10-06T11:45:19.495+00:00",
  "name": "FAMILY",
  "name_en": "FAMILY",
  "name_lat": "ĢIMENE",
  "subCategories": [
    "Planning pregnancy",
    "During pregnancy",
    "Infertility & IVF",
    "Abortions",
    "Giving birth & Post partum",
    "Parenting challenges"
  ],
  "subcategories_en": [
    "Planning pregnancy",
    "During pregnancy",
    "Infertility & IVF",
    "Abortions",
    "Giving birth & Post partum",
    "Parenting challenges"
  ],
  "subcategories_lat": [
    "Grūtniecības plānošana",
    "Grūtniecības laikā",
    "Neauglība un IVF",
    "Aborti",
    "Dzemdības un pēcdzemdību periods",
    "Audzināšanas izaicinājumi"
  ]
}
```

---

## Need Help?

If you encounter any issues:
1. Check this guide first
2. Verify all fields are filled correctly
3. Contact the development team with:
   - Screenshot of the category document
   - Description of the issue
   - What you expected vs. what happened

---

**Last Updated:** October 2025
**Version:** 1.0
