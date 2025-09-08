// Global declarations to quiet TypeScript about non-TS imports
// Add this file to the project root `src/global.d.ts` (or keep it under `src/` so tsconfig picks it up)

declare module "*.module.css" {
  const classes: { readonly [className: string]: string };
  export default classes;
}

declare module "*.css" {
  // Some projects import plain CSS (not modules); support both styles.
  const content: { readonly [className: string]: string } | string;
  export default content;
}

declare module "*.svg" {
  // SVGs often imported as URL strings in many bundlers
  const src: string;
  export default src;
}

declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.webp";
declare module "*.bmp";

declare module "*.js" {
  const value: any;
  export default value;
}

declare module "*.jsx" {
  const value: any;
  export default value;
}

declare module "*.ts" {
  const value: any;
  export default value;
}

declare module "*.tsx" {
  const value: any;
  export default value;
}

// Optional: if you want to silence imports of arbitrary files (like .json via import)
declare module "*?raw" {
  const content: string;
  export default content;
}

/*
  Specific module declaration for the App CSS module to ensure imports like:
    import styles from "./App.module.css";
  are recognized with a typed default export.
*/
declare module "./App.module.css" {
  const classes: {
    readonly app: string;
    readonly gridWrap: string;
    readonly grid: string;
    readonly footer: string;
    readonly [className: string]: string;
  };
  export default classes;
}

// Ensure this file is treated as a module
export {};
