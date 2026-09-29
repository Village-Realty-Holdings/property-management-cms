/**
 * Preview (ADR-0018): a Draft drawn by the CMS with the Site's views, for the
 * Staff User asking. `previewFor` is the route's whole interface;
 * `previewAdmin` points the collections' Preview button and Live Preview
 * panel at it.
 */
export {
  previewFor,
  type LoginRequired,
  type NotFound,
  type Preview,
  type PreviewCollection,
  type PreviewParams,
} from "./previewFor"
export { previewAdmin } from "./url"
