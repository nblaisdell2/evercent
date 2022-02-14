import { post, get, patch } from "axios";

var baseURL = "https://api.youneedabudget.com/v1";
const RATE_LIMIT_THRESHOLD = 180;

export async function get_ynab_oauth_token(params) {
  console.log("ynab params", params);
  return await post("https://app.youneedabudget.com/oauth/token", params)
    .then((response) => response.data)
    .catch((e) => {
      console.log("ERROR FROM YNAB (get_ynab_oauth_token)");
      console.log(e);
    });
}

export async function get_rate_limit_details(response) {
  let rateLim = response.headers["x-rate-limit"];
  let rateLimLeft = parseInt(rateLim.substring(0, rateLim.indexOf("/")));
  let rateLimitDetails = {
    rateLimit: rateLim,
    overThreshold: rateLimLeft >= RATE_LIMIT_THRESHOLD,
  };

  return rateLimitDetails;
}

export async function GetNewAccessToken(authCode) {
  return await get_ynab_oauth_token({
    client_id: process.env.YNAB_CLIENT_ID,
    client_secret: process.env.YNAB_CLIENT_SECRET,
    redirect_uri: process.env.YNAB_REDIRECT_URI_LOCAL,
    grant_type: "authorization_code",
    code: authCode,
  });
}

export async function GetNewAccessTokenRefresh(refreshToken) {
  return await get_ynab_oauth_token({
    client_id: process.env.YNAB_CLIENT_ID,
    client_secret: process.env.YNAB_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }).then((response) => {
    // Set the access/refresh/expiration date on the
    // preUserDetails before sending it to the page
    let newAccToken = response.access_token;
    let newRefToken = response.refresh_token;
    let expireSeconds = response.expires_in;

    let newExpirDate = new Date();
    newExpirDate.setSeconds(newExpirDate.getSeconds() + expireSeconds);

    return {
      accToken: newAccToken,
      refToken: newRefToken,
      expireSeconds: expireSeconds,
      expirationDate: newExpirDate.toISOString(),
    };
  });
}

export async function GetBudgetID(accToken) {
  return await get(baseURL + "/budgets/default", {
    headers: {
      Authorization: "Bearer " + accToken,
    },
  }).then((response) => response.data.data.budget.id);
}

export async function GetAllCategories(accToken, budgetID = "default") {
  return await get(baseURL + "/budgets/" + budgetID + "/categories", {
    headers: {
      Authorization: "Bearer " + accToken,
    },
  })
    .then((response) => response.data)
    .catch((err) => {});
}

export async function GetAllBudgetMonths(accToken, budgetID = "default") {
  return await get(baseURL + "/budgets/" + budgetID, {
    headers: {
      Authorization: "Bearer " + accToken,
    },
  })
    .then((response) => response.data)
    .catch((err) => {
      console.log("ERROR FROM YNAB");
      console.log(err);
    });
}

export async function PostCategoryMonth(
  accToken,
  categoryID,
  month,
  categoryAmount,
  budgetID = "default"
) {
  let ynabURI = GetAPIBudgetMonthURL(
    categoryID,
    new Date(month).toISOString(),
    budgetID
  );

  let postData = {
    category: {
      budgeted: parseInt(parseFloat(categoryAmount) * 1000),
    },
  };

  return await patch(ynabURI, postData, {
    headers: { Authorization: "Bearer " + accToken },
  })
    .then((response) => {
      console.log("Added data to YNAB successfully!");
      // console.log(response);
      console.log(response.headers["x-rate-limit"]);
      return get_rate_limit_details(response);
    })
    .catch((err) => {
      console.log("Error from YNAB");
      console.log(err);
    });
}

export function GetAuthURL(client_id, redirect_uri) {
  return (
    "https://app.youneedabudget.com/oauth/authorize?client_id=" +
    client_id +
    "&redirect_uri=" +
    redirect_uri +
    "&response_type=code"
  );
}

export function GetAPIBudgetMonthURL(
  categoryID,
  monthISO,
  budgetID = "default"
) {
  return (
    baseURL +
    "/budgets/" +
    budgetID +
    "/months/" +
    monthISO.slice(0, 10) +
    "/categories/" +
    categoryID
  );
}
