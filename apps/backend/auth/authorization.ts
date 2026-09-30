import  express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { Request , Response, NextFunction } from "express";
import { Interface } from "node:readline";
import { string } from "zod";
dotenv.config();

const app = express();
interface RequestwithUserId extends Request{
    userId : string;
}
const SECRET_KEY = process.env.SECRET_KEY;
if(!SECRET_KEY){
    throw new Error("SECRET_KEY is not defined")
}
interface AuthTokenPayload extends JwtPayload {
    userId: string;
    email: string;
}
  function verifyToken(req: Request & {userId: string}, res: Response, next: NextFunction){
      try {
        const tokenverify = req.headers.authorization;
    if(!tokenverify){
        return res.status(401).json({error: "unauthorized"})
    }
    const token = tokenverify.split(" ")[1];
    if(!token){
        return res.status(401).json({error: "token not found"})
    }
    const decoded = jwt.verify(token, SECRET_KEY as string) as unknown as AuthTokenPayload;

    req.userId = decoded.userId;     if(!decoded){
        return res.status(401).json({error: "invalid token"})
     }
     req.userId = decoded.userId;
     next();
  } 
  catch(error){
     return res.status(500).json({error: "internal server error"})
  }
}