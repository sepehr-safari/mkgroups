import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";

import Index from "./pages/Index";
import GroupList from "./pages/GroupList";
import GroupChat from "./pages/GroupChat";
import ThreadView from "./pages/ThreadView";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/groups" element={<GroupList />} />
        <Route path="/group/:groupId" element={<GroupChat />} />
        <Route path="/thread/:nip19Id" element={<ThreadView />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;