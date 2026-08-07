import axios from 'axios';
import { HttpsProxyAgent } from "https-proxy-agent";
import "dotenv/config";

export async function Github(username: string) {
    const httpsAgent = new HttpsProxyAgent(process.env.ProxyUrl!);
    console.log("PROXY_URL =", process.env.PROXY_URL);
    console.log("ProxyUrl =", process.env.ProxyUrl);
console.log("PROXY_URL =", process.env.PROXY_URL);
    const userinfo = await axios.get(`https://api.github.com/users/${username}/repos`,{httpsAgent});

    return  userinfo.data.map((x:any) =>({
        description : x.description,
        name : x.name,
        fullname : x.fullname,
    }))
}