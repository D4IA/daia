import { BrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AppRouter from "./router/AppRouter";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <AppRouter />
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
