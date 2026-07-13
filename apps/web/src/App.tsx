import { Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Record } from "./pages/Record";
import { ReviewDetail } from "./pages/ReviewDetail";
import { Profile } from "./pages/Profile";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <Home />
          </AuthGuard>
        }
      />
      <Route
        path="/record"
        element={
          <AuthGuard>
            <Record />
          </AuthGuard>
        }
      />
      <Route path="/review/:id" element={<ReviewDetail />} />
      <Route path="/profile/:id" element={<Profile />} />
    </Routes>
  );
}

export default App;
