const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export const ui = {
  primaryButton: `inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 ${focus}`,
  secondaryButton: `inline-flex items-center justify-center rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900 ${focus}`,
  dangerButton: `inline-flex items-center justify-center rounded-md bg-red-700 px-3 py-1.5 font-medium text-white hover:bg-red-800 disabled:opacity-60 ${focus}`,
  input: `w-full rounded-md border border-neutral-400 bg-transparent px-3 py-2 dark:border-neutral-600 ${focus}`,
  link: `font-medium text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ${focus}`,
  focus,
};
