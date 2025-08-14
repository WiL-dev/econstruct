import { BrowserRouter, Routes, Route } from "react-router-dom";
import UploadAndPickLeaflet from "./UploadAndPickLeaflet";
import "./index.css"
import DashboardCharts from "./DashboardCharts";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadAndPickLeaflet />} />
        <Route path="/dashboard/:code" element={<DashboardCharts />} />
      </Routes>
    </BrowserRouter>
  );
}