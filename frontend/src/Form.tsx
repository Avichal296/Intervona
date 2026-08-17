import { useState } from 'react';
import axios from 'axios';
import { BackendUrl } from './lib /config';


import './App.css'
import { useNavigate} from 'react-router';
export function Form(){
  const [GithubUrl, setGithubUrl] = useState('');
  const navigate = useNavigate();

    async function handleSubmit(){
        if(GithubUrl.trim() === ''){
             return  alert("Github URL is required");       
        }
        const Response =  await axios.post(`${BackendUrl}/api/v1/interview`,{
          GithubUrl : GithubUrl
        })
   navigate(`/interview/${Response.data.id}`)
    }
    return (
        <div className="h-screen w-screen flex items-center justify-center">
        <div className="flex flex-col gap-4">
          <h2 className='text-2xl font-bold'>
             AI interview Assistant
          </h2>
          <input
          onChange ={(e) => setGithubUrl(e.target.value)}
            className="border-2 border-gray-300 rounded-sm p-4 placeholder:text-center"
            type="text"
            placeholder="Github URL"
          />
      
          <button  onSubmit={handleSubmit}   className="bg-blue-500 text-white rounded-sm p-4 hover:bg-blue-600">
            Submit
          </button>
        </div>
      </div>
    )
}