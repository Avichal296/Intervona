export default async function handler(req: any, res: any) {
    const { default: app } = await import("../apps/backend/src/index.js");
  
    return app(req, res);
  }