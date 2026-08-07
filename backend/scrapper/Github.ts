import axios from 'axios';
const httpsProxyAgent = require('https-proxy-agent');
const httpsAgent = new httpsProxyAgent(process.env.ProxyUrl);

export async function Github(username: string) {
    const userinfo = await axios.get(`https://api.github.com/users/${GithubUsername}/repos`,httpsAgent);

    return  userinfo.data.map((x:any) =>{
        description : x.description;
        name: x.name;
        fullname: x.fullname;
    })
}