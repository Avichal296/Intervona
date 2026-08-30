import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Form } from "./Form";
import { Interview } from "./interview";
import { Result } from "./Result";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/" element={<Navigate to="/" replace />} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/result/:id" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
