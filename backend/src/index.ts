import express from 'express';
import "dotenv/config";

import axios from 'axios';
import { Github } from "../scrapper/Github.js";
import { ParseInterview } from '../type.js';
import { any, json, string } from 'zod';
import { prisma } from '../db.js'
import cors from 'cors';
import { id } from 'zod/v4/locales';
import { GoogleGenAI, Modality } from "@google/genai";
const app = express();
const apiKey = process.env.API_KEY;

if (!apiKey) {
  throw new Error("API_KEY is not defined");
}

const gemini = new GoogleGenAI({
  apiKey,
});
app.use(express.json());
app.use(cors());
app.post('/api/v1/interview', async (req: any ,res: any ) =>{
    try{
        const r =  ParseInterview.safeParse(req.body);
    
    if(!r.success){
        return  res.status(404).json({error: "Invalid Github Url"});
    }

   const GithubUrl = r.data.github.endsWith('/') ? r.data?.github.slice(0, -1) : r.data?.github;
   const GithubUsername = GithubUrl.split("/").pop()!.split("?")[0]; 
   if (!GithubUsername) {
    return res.status(400).json({
      error: "Invalid Github URL",
    });
  }   
    const githubData = await Github(GithubUsername);

    const interview = await prisma.interview.create({
      data: {
        status: "PRE",
        githubMetaData: githubData,
      },
    });

    
    //  const result = await Github(GithubUsername);
     res.json( {
        id: interview.id
     })} catch (error: any) {
        console.error("PRISMA ERROR");
        console.error("code:", error?.code);
        console.error("message:", error?.message);
        console.error("meta:", error?.meta);
    
        return res.status(500).json({
          error: error?.message,
          code: error?.code,
        })
    }
});


app.get("/api/v1/gemini-token", async (req, res) => {
    try {
      const expireTime = new Date(
        Date.now() + 30 * 60 * 1000
      ).toISOString();
  
      const token = await gemini.authTokens.create({
        config: {
          uses: 1,
          expireTime,
  
          newSessionExpireTime: new Date(
            Date.now() + 60 * 1000
          ).toISOString(),
  
          liveConnectConstraints: {
            model: "gemini-3.1-flash-live-preview",
            config: {
              sessionResumption: {},
              responseModalities: [Modality.AUDIO],
            },
          },
        },
      });
  
      return res.json({
        token: token.name,
      });
    } catch (error) {
      console.error("Gemini token error:", error);
  
      return res.status(500).json({
        error: "Failed to create Gemini token",
      });
    }
  });
  app.get("/api/v1/interview/:id", async (req, res) => {
    try {
      const interview = await prisma.interview.findUnique({
        where: {
          id: req.params.id,
        },
      });
  
      if (!interview) {
        return res.status(404).json({
          error: "Interview not found",
        });
      }
  
      return res.json(interview);
    } catch (error) {
      console.error(error);
  
      return res.status(500).json({
        error: "Failed to fetch interview",
      });
    }
  });
app.listen(3001);