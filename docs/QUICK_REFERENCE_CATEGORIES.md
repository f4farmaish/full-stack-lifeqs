# Quick Reference: Adding Categories

## 🚀 Quick Add Checklist

### Required Fields (6 total)

```yaml
✓ name:              "ENGLISH NAME"
✓ name_en:           "ENGLISH NAME"
✓ name_lat:          "LATVIEŠU NOSAUKUMS"
✓ subCategories:     ["English 1", "English 2"]
✓ subcategories_en:  ["English 1", "English 2"]
✓ subcategories_lat: ["Latviešu 1", "Latviešu 2"]
```

---

## 📋 Copy-Paste Template

```json
{
  "name": "CATEGORY_NAME_EN",
  "name_en": "CATEGORY_NAME_EN",
  "name_lat": "CATEGORY_NAME_LAT",
  "subCategories": [
    "Subcategory 1",
    "Subcategory 2",
    "Subcategory 3"
  ],
  "subcategories_en": [
    "Subcategory 1",
    "Subcategory 2",
    "Subcategory 3"
  ],
  "subcategories_lat": [
    "Apakškategorija 1",
    "Apakškategorija 2",
    "Apakškategorija 3"
  ]
}
```

---

## ⚡ Speed Guide

### 1. Open Appwrite
`Database → lifeqs-db → Categories → Create Document`

### 2. Fill Fields
- Copy template above
- Replace `CATEGORY_NAME_EN` with your English category
- Replace `CATEGORY_NAME_LAT` with Latvian translation
- Add your subcategories in English
- Add your subcategories in Latvian (same order!)

### 3. Save
Click "Create" ✅

---

## ⚠️ Common Mistakes

| ❌ Wrong | ✅ Right |
|----------|----------|
| Empty `name_lat` | All fields filled |
| 3 English, 2 Latvian subcats | Equal number both languages |
| lowercase "family" | UPPERCASE "FAMILY" |
| Changing English names | Keep English values stable |

---

## 🔄 Array Order Matters!

```json
// ✅ CORRECT - Arrays match
"subcategories_en": ["A", "B", "C"]
"subcategories_lat": ["A_lat", "B_lat", "C_lat"]

// ❌ WRONG - Different order
"subcategories_en": ["A", "B", "C"]
"subcategories_lat": ["C_lat", "A_lat", "B_lat"]
```

---

## 🌐 Where to Get Translations?

- **Google Translate**: https://translate.google.com (EN → LV)
- **Ask Team**: Latvian native speakers for accuracy
- **See Below**: Common terms reference

---

## 📚 Common Terms

| EN | LAT |
|----|-----|
| Health | Veselība |
| Family | Ģimene |
| Work | Darbs |
| Education | Izglītība |
| Sports | Sports |
| Food | Ēdiens |
| Home | Mājas |
| Money | Nauda |
| Travel | Ceļošana |
| Friends | Draugi |

---

## 🆘 Troubleshooting

**Not showing?**
- Hard refresh: `Cmd+Shift+R` / `Ctrl+Shift+R`
- Wait 10 min for cache

**Wrong language?**
- Check `name_lat` is filled
- Check field name spelling

**Filter broken?**
- English values must match posts exactly
- Don't change existing English names

---

For detailed guide, see: `ADMIN_GUIDE_CATEGORIES.md`
