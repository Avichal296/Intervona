import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./Landing";
import { Form } from "./Form";
import { Interview } from "./interview";
import { Result } from "./result";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/form" element={<Form />} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/result/:id" element={<Result />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
