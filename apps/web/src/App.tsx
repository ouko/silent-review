import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { StreakAtRiskToast } from "./components/notifications/StreakAtRiskToast";

function App() {
  return (
    <>
      <StreakAtRiskToast />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
