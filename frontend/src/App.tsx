import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MelodiMusicDashboard from "./pages/MelodiMusicDashboard";
import Search from "./pages/search";
import Library from "./pages/library";
import LikedSongs from "./pages/likedSongs";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<MelodiMusicDashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/library" element={<Library />} />
        <Route path="/liked-songs" element={<LikedSongs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;