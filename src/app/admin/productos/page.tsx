import { redirect } from "next/navigation";

/**
 * /admin/productos was merged into /admin/precios — the unified product
 * management view (catalog table + bulk price editor + CRUD + insights).
 * Kept as a redirect for any old bookmarks.
 */
export default function AdminProductosRedirect() {
  redirect("/admin/precios");
}
