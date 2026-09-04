const appPromise = import("../apps/backend/src/index.js");

module.exports = async (req, res) => {
  const { default: app } = await appPromise;
  return app(req, res);
};