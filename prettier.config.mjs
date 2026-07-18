/** @type {import("prettier").Config} */
const config = {
  // Use single quotes instead of double quotes for strings
  singleQuote: true,

  // Always print semicolons at the end of statements
  semi: true,

  // Add trailing commas wherever valid in ES5+ (objects, arrays, params)
  // Makes diffs cleaner — only the new line shows up, not the comma on the previous one
  trailingComma: 'all',

  // Wrap lines at 100 chars — wider than 80 to accommodate verbose TypeScript generics and types
  printWidth: 100,

  // 2-space indentation (standard for JS/TS)
  tabWidth: 2,

  // Use spaces, not tabs
  useTabs: false,

  // Print spaces between object braces: { foo: bar } instead of {foo: bar}
  bracketSpacing: true,

  // Always include parens around arrow function arguments: (x) => x instead of x => x
  // Keeps things consistent when adding types: (x: string) => x
  arrowParens: 'always',

  // Use LF line endings for cross-platform consistency (Linux/macOS/CI)
  endOfLine: 'lf',
};

export default config;
