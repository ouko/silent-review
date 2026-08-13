import { lazy } from "react";

const browseImport = () => import("../pages/Home").then((m) => ({ default: m.Home }));

export const Browse = lazy(browseImport);

export function preloadBrowse() {
  void browseImport();
}
