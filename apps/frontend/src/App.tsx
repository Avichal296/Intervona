import { Form } from './Form'
import './App.css'
import {Interview} from './interview'
import {Result} from './result'
import { BrowserRouter, Routes, Route } from "react-router-dom";



function App() {
//  const [page, setpage] = useState<'form' | 'Interview' | 'Result'> ('form');


  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path = "/form" element={<Form/>} />
      <Route path = "/Interview/:id" element= {<Interview/>}/>
      <Route path = "/Result/:id" element={<Result/>}/>


     </Routes>
    
    
    
    </BrowserRouter>
     

      {/* <div>
        {page === 'form' && <Form />}
        {page === 'Interview' && <Interview />}
        {page === 'Result' && <Result />}
      </div> */}
      
    </>
  )
}

export default App;
