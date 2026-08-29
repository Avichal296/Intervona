import { useEffect, useState } from "react";
import {useParams} from "react-router"
import { BackendUrl } from "./lib /config";
import axios from 'axios'

interface Result {
    score: number,
    feedback: string,
    transcript: {type: "Assistant" | "User" , content: string}[]
}
export async function Result() {
    const {id } = useParams();
    const [Result , setResult] = useState<Result>({
        score : 0,
        feedback: "",
        transcript: []
    })
    useEffect(()=>{
          axios.get(`${BackendUrl}/api/v1/result/${id}`)
         .then(response =>{
            setResult(response.data);
         })
        const time =  setInterval(()=>{
             axios.get(`${BackendUrl}/api/v1/result/${id}`)
            .then(response =>{
               setResult(response.data);
            },[5*1000])

            return () => {
                clearInterval(time);
            }

         })
    },[id])
    return (
        <div>
            <h1> result</h1>
        </div>
    )
};