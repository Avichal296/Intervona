import express from 'express';
import axios from 'axios';
import { Github } from "../scrapper/Github.js";
import { ParseInterview } from '../type.js';
import { json, string } from 'zod';
import { Prisma } from '../db.js'
import cors from 'cors';
import { id } from 'zod/v4/locales';
const app = express();
app.use(express.json());
app.use(cors());
app.post('/api/v1/interview', async (req: any ,res: any ) =>{
    const r =  ParseInterview.safeParse(req.body);
    
    if(!r.success){
        return  res.status(404).json({error: "Invalid Github Url"});
    }

   const GithubUrl = r.data.github.endsWith('/') ? r.data?.github.slice(0, -1) : r.data?.github;
    const GithubUsername = GithubUrl.split("/").pop()!;
    
    const  interview = await Prisma.interview.create({
         data: {
            status: id,
            githubmetadata : JSON.stringify(GithubUsername)   
        
      }
    })

    
     const result = await Github(GithubUsername);
     res.json( {
        github: result
     })
})
app.listen(3001);