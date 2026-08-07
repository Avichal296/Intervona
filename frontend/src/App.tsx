import { Form } from './Form'
import './App.css'
import { useState } from 'react'
import {Interview} from './interview'
import {Result} from './result'


function App() {
 const [page, setpage] = useState<'form' | 'Interview' | 'Result'> ('form');
  return (
    <>
      <div>
        {page === 'form' && <Form />}
        {page === 'Interview' && <Interview />}
        {page === 'Result' && <Result />}
      </div>
      
    </>
  )
}

export default App;
