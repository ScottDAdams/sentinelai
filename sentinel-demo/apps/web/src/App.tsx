import { Routes, Route } from "react-router-dom";
import RunCreate from "./screens/RunCreate";
import RunResult from "./screens/RunResult";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RunCreate />} />
      <Route path="/runs/:id" element={<RunResult />} />
    </Routes>
  );
}
