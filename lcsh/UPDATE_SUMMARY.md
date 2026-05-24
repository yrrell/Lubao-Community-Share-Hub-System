# LSH v2.0 — Update Summary

**Lubao Community Share Hub** · Next.js + TypeScript + Turso
**Updated:** May 2026

---

## What's New in This Update

### 1. 🌙 Dark / Light Theme System

**Files added/modified:**
- `src/contexts/ThemeContext.tsx` — React context provider
- `src/components/ui/ThemeToggle.tsx` — animated toggle button
- `tailwind.config.ts` — `darkMode: "class"` enabled
- `src/app/globals.css` — all `.dark:*` utility variants
- `src/app/layout.tsx` — inline script prevents flash-of-wrong-theme

**How it works:**
- Theme is stored in `localStorage` under key `lsh-theme`
- Falls back to system preference (`prefers-color-scheme`)
- The `<html>` element gets `class="dark"` added/removed instantly
- All components use Tailwind `dark:` variants for colors
- The toggle button appears in the sidebar (for logged-in users) and top-right corner of login/register/about pages

**Usage:**
```tsx
import { useTheme } from "@/contexts/ThemeContext";
const { theme, toggleTheme, isDark } = useTheme();
```

---

### 2. ⚡ Professional Loading Screen

**File:** `src/components/loading/LoadingScreen.tsx`

**Features:**
- Full-screen dark overlay with animated background rings
- Pulsing floating particles
- Your logo (`/assets/images/logo/lsh-logo.png`) with a glow effect
- App name and animated version badge
- Progress bar with real-time percentage counter
- Cycling status messages ("Initializing…", "Loading data…", etc.)
- Three animated bouncing dots
- Smooth fade-out transition → login page fades in

**Integration:**
The loading screen is embedded in `src/app/(auth)/login/page.tsx`.  
It runs for ~3 seconds then calls `onComplete()`, which fades out the screen and reveals the login form.

**Customise duration:**
```tsx
<LoadingScreen onComplete={handleLoadComplete} duration={3000} />
// duration = milliseconds (default 3000ms = 3 seconds)
```

---

### 3. ℹ️ About Page (`/about`)

**File:** `src/app/about/page.tsx`

**Sections:**
| Section | Content |
|---|---|
| Hero | Logo, app name, animated version badge |
| About | Platform description |
| Features | 8 feature cards with icons and tags |
| Built With | 6 technology pills |
| Developer | Photo + name + title + email |
| Connect | Email, Facebook, GitHub, Web App links |
| Version History | v2.0.0 (current) + v1.0.0 changelog |

**Image paths used:**
- Logo: `/assets/images/logo/lsh-logo.png`
- Developer: `/assets/images/developer_image/developer.png`

**Linked from:**
- Login page (`/login`) — top-right "About" button
- Register page — (accessible via URL)
- Sidebar — "About" nav link for logged-in users

---

### 4. 🎨 Design System Updates

**Font upgrade:**
- Body: `Plus Jakarta Sans` (replaces Inter)
- Display/headings: `Sora`

**New animations in `tailwind.config.ts`:**
- `fade-in` — opacity 0→1
- `slide-up` — slide + fade in
- `scale-in` — scale + fade in
- `pulse-glow` — green glow pulse
- `loading-bar` — progress bar
- `dot-1/2/3` — staggered bounce dots

**Sidebar enhancements:**
- Dark mode styling throughout
- Theme toggle integrated into sidebar footer
- About page link added to both user and admin sidebars

---

## File Placement Guide

### Images (required)

```
public/
└── assets/
    └── images/
        ├── logo/
        │   └── lsh-logo.png          ← Your LSH logo
        └── developer_image/
            └── developer.png         ← Developer photo
```

> **Important:** Files must be in `public/` to be served by Next.js.
> The components reference them as `/assets/images/...` (relative to `public/`).
> Both images have graceful fallbacks if the file is missing.

### Default placeholder images (recommended)

```
public/
└── uploads/
    └── defaults/
        ├── default-user.png          ← Fallback user avatar
        └── default-tool.png          ← Fallback tool image
```

---

## All Changed Files

| File | Change Type | Description |
|---|---|---|
| `tailwind.config.ts` | Modified | Added `darkMode: 'class'`, new animations, Sora font |
| `src/app/layout.tsx` | Modified | ThemeProvider, new Google Fonts, anti-flash script |
| `src/app/globals.css` | Modified | Dark mode variants, font variables, shimmer keyframe |
| `src/app/(auth)/login/page.tsx` | Modified | Added LoadingScreen, dark mode styling, About link |
| `src/app/(auth)/register/page.tsx` | Created | Full register form with dark mode |
| `src/app/about/page.tsx` | Created | Full About page |
| `src/components/layout/Sidebar.tsx` | Modified | Dark mode, ThemeToggle, About link |
| `src/components/ui/ThemeToggle.tsx` | Created | Animated theme toggle button |
| `src/components/loading/LoadingScreen.tsx` | Created | Professional animated loading screen |
| `src/contexts/ThemeContext.tsx` | Created | Theme state management |
| `next.config.ts` | Modified | Added `/assets/**` to image localPatterns |
| `public/assets/images/logo/README.md` | Created | Instructions for logo placement |
| `public/assets/images/developer_image/README.md` | Created | Instructions for dev photo |

---

## Quick Start After Downloading

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Place your images:
#    public/assets/images/logo/lsh-logo.png
#    public/assets/images/developer_image/developer.png

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
#    → Loading screen plays for 3s → Login page appears
#    → Click sun/moon icon to toggle dark/light mode
#    → Click "About" to see the about page
```

---

*LSH v2.0.0 · Lubao, Pampanga · May 2026*
