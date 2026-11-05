import { Route, Routes } from "react-router-dom";
import { AdminPage } from "./features/admin/AdminPage";
import { SessionProvider } from "./features/auth/SessionProvider";
import { SignInPage } from "./features/auth/SignInPage";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { WorkPage } from "./features/catalog/WorkPage";
import { ShelfProvider } from "./features/shelf/ShelfProvider";
import { ShelfPage } from "./features/shelf/ShelfPage";
import { AppFrame } from "./shell/AppFrame";

export function App() {
  return (
    <SessionProvider>
      <ShelfProvider>
        <AppFrame>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/work/:workId" element={<WorkPage />} />
            <Route path="/shelf" element={<ShelfPage />} />
            <Route path="/curation" element={<AdminPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="*" element={<CatalogPage />} />
          </Routes>
        </AppFrame>
      </ShelfProvider>
    </SessionProvider>
  );
}
