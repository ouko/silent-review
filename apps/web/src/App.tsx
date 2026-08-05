import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { StreakAtRiskToast } from "./components/notifications/StreakAtRiskToast";
import { ChallengeNotificationToast } from "./components/notifications/ChallengeNotificationToast";

function App() {
  return (
    <>
      <StreakAtRiskToast />
      <ChallengeNotificationToast />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
