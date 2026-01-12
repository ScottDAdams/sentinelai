import { Routes, Route } from "react-router-dom";
import RunCreate from "./screens/RunCreate";
import RunResult from "./screens/RunResult";
import AdminPolicyPack from "./screens/AdminPolicyPack";
import PolicyInsights from "./screens/PolicyInsights";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RunCreate />} />
      <Route path="/runs/:id" element={<RunResult />} />
      <Route path="/policies" element={<AdminPolicyPack />} />
      <Route path="/insights" element={<PolicyInsights />} />
    </Routes>
  );
}
