# Login hero slideshow images

The login page's left (purple) panel shows a cross-fading slideshow of the
images in this folder. Drop your images here and they are served at
`/login-slides/<file>` (the `public/` folder is copied to the site root).

## How to add / change slides

1. Copy your images into this folder. It currently ships with placeholders the
   layout points at:

   - `slide-1.png`
   - `slide-2.png`
   - `slide-3.png`

   Replace them with your own (keep the same names to avoid editing code), or add
   your own files and update the list in step 2. Use landscape images,
   ~1600×1000 or larger, JPG/PNG/WebP.

2. To use different names / a different number of slides, edit the `slides`
   array in:

   `FrontEnd/src/app/layouts/auth-layout/auth-layout.ts`

   e.g.

   ```ts
   protected readonly slides = [
     '/login-slides/forex-hero.jpg',
     '/login-slides/mobile-app.png',
   ];
   ```

Notes:
- Each slide is shown for ~6 seconds, then cross-fades to the next.
- A missing file simply fades to the purple background (no error), so it's safe
  to have fewer files than the list — but keep the list in sync to avoid gaps.
