const ynab = require("../../../ynab");

export default async function handler(req, res) {
  // Get the parameters from the client
  let myParams = { ...req.body.params };
  // console.log("In next function");
  // console.log(myParams);

  let apiData = await ynab.GetNewAccessTokenRefresh(myParams.refToken);
  res.status(200).json(apiData);
}
