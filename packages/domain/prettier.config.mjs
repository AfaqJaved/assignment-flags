// Prettier doesn't have a native "extends" — we import and spread the root config manually
import rootConfig from '../../prettier.config.mjs';

/** @type {import("prettier").Config} */
const config = {
  // Inherit all root-level rules
  ...rootConfig,
};

export default config;
