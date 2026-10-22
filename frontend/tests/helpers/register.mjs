// Registers the JSX loader hooks for the storefront test run.
import { register } from "node:module";

register("./jsx-hooks.mjs", import.meta.url);
