import AppRouter from "./routes/AppRouter";
import ScrollToHash from "./components/common/ScrollToHash";

export default function App() {
  return (
    <>
      <ScrollToHash />
      <AppRouter />
    </>
  );
}