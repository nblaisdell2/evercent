const utils = require("../../../utils");

export default async function handler(req, res) {
  // Get the parameters from the client
  let myParams = { ...req.body.params };
  console.log("In next function");
  console.log(myParams);

  // Pull out the "endpoint" parameter, and then remove it
  // from the set of parameters, since I don't want to include this
  // in the parameters for the called stored procedure
  let endpoint = myParams["endpoint"];
  delete myParams["endpoint"];

  let apiData = await utils.getAPIData(endpoint, myParams);
  res.status(200).json(apiData);
}
