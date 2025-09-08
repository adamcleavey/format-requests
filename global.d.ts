/**
 * Project-level global TypeScript declarations.
 *
 * Place this file at the project root as `global.d.ts` so the TypeScript
 * compiler picks it up regardless of where `src/` is included.
 *
 * These declarations quiet import errors for CSS modules, plain CSS, images,
 * and JS/JSX imports when you are using TypeScript with a mixed JS/TS codebase.
 *
 * Keep this file intentionally permissive (many `any`/string exports) — you can
 * later narrow individual module typings if you prefer stricter checks.
 */

/* CSS Modules (.module.css / .module.scss / .module.sass / .module.less) */
declare module "*.module.css" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
declare module "*.module.scss" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
declare module "*.module.sass" {
  const classes: { readonly [className: string]: string };
  export default classes;
}
declare module "*.module.less" {
  const classes: { readonly [className: string]: string };
  export default classes;
}

/* Plain CSS (non-module) */
declare module "*.css" {
  const content: { readonly [className: string]: string } | string;
  export default content;
}
declare module "*.scss" {
  const content: { readonly [className: string]: string } | string;
  export default content;
}
declare module "*.sass" {
  const content: { readonly [className: string]: string } | string;
  export default content;
}
declare module "*.less" {
  const content: { readonly [className: string]: string } | string;
  export default content;
}

/* Images and media */
declare module "*.svg" {
  const src: string;
  export default src;
}
declare module "*.png" {
  const src: string;
  export default src;
}
declare module "*.jpg" {
  const src: string;
  export default src;
}
declare module "*.jpeg" {
  const src: string;
  export default src;
}
declare module "*.gif" {
  const src: string;
  export default src;
}
declare module "*.webp" {
  const src: string;
  export default src;
}
declare module "*.avif" {
  const src: string;
  export default src;
}
declare module "*.mp4" {
  const src: string;
  export default src;
}
declare module "*.mp3" {
  const src: string;
  export default src;
}

/* Other asset suffixes (catch-all) */
declare module "*?raw" {
  const content: string;
  export default content;
}

/* Allow importing JS/JSX files without type declarations (treat as any) */
declare module "*.js" {
  const value: any;
  export default value;
}
declare module "*.cjs" {
  const value: any;
  export default value;
}
declare module "*.mjs" {
  const value: any;
  export default value;
}
declare module "*.jsx" {
  const value: any;
  export default value;
}

/* Allow importing TS/TSX too (sometimes helpful for mixed extension builds) */
declare module "*.ts" {
  const value: any;
  export default value;
}
declare module "*.tsx" {
  const value: any;
  export default value;
}

/*
  Short, permissive fallback for any other unknown modules. Use this if you
  occasionally import files with unusual extensions.
*/
declare module "*" {
  const value: any;
  export default value;
}

/* Ensure this file is treated as a module by TypeScript */
export {};
