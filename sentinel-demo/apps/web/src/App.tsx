import { Routes, Route } from "react-router-dom";
import RunCreate from "./screens/RunCreate";
import RunResult from "./screens/RunResult";
import AdminPolicyPack from "./screens/AdminPolicyPack";
import PolicyInsights from "./screens/PolicyInsights";
import InvestigateList from "./screens/InvestigateList";
import InvestigateDetail from "./screens/InvestigateDetail";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RunCreate />} />
      <Route path="/runs/:id" element={<RunResult />} />
      <Route path="/investigate" element={<InvestigateList />} />
      <Route path="/investigate/:id" element={<InvestigateDetail />} />
      <Route path="/policies" element={<AdminPolicyPack />} />
      <Route path="/insights" element={<PolicyInsights />} />
    </Routes>
  );
}
