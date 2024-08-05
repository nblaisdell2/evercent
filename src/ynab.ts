import { AxiosResponseHeaders } from "axios";
import { logError } from "./utils/log";

import { config } from "dotenv";
import { getAPIResponse } from "./utils/api";
config();

export type TokenDetails = {
  accessToken: string;
  refreshToken: string;
  expirationDate: string;
};

export type YNABTokenData = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

export type YNABBudget = {
  id: string;
  name: string;
  category_groups: YNABCategoryGroup[];
  categories: YNABCategory[];
  months: YNABBudgetMonth[];
};

export type YNABCategoryGroup = {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
};

export type YNABCategory = {
  id: string;
  category_group_id: string;
  category_group_name: string;
  name: string;
  budgeted: number;
  activity: number;
  balance: number;
  hidden: boolean;
  deleted: boolean;
};

export type YNABBudgetMonth = {
  month: string;
  categories: YNABCategory[];
  to_be_budgeted: number;
};

const CLIENT_ID = process.env.SERVER_YNAB_CLIENT_ID;
const CLIENT_SECRET = process.env.SERVER_YNAB_CLIENT_SECRET;
const REDIRECT_URI =
  (process.env.SERVER_API_BASE_URL as string) +
  (process.env.SERVER_YNAB_REDIRECT_URI as string);

const APP_BASE_URL = "https://app.ynab.com";
const OAUTH_URL = APP_BASE_URL + "/oauth";
export const YNAB_API_URL = "https://api.ynab.com/v1";

const RATE_LIMIT_THRESHOLD = 180;

export const isOverRateLimitThreshold = (
  headers: AxiosResponseHeaders
): boolean => {
  let rateLim = headers["x-rate-limit"];
  // log("Rate Limit:", rateLim);
  let rateLimLeft = parseInt(rateLim.substring(0, rateLim.indexOf("/")));
  // log("Rate Limit Left", rateLimLeft);
  return rateLimLeft >= RATE_LIMIT_THRESHOLD;
};

export const getNewAccessTokens = async (
  authCode: string
): Promise<TokenDetails | null> => {
  // An auth code was provided, so this request is attempting to
  // connect to a user's budget for the first time, after they visited
  // the YNAB auth page where they select their default budget
  const { data, error } = await getAPIResponse({
    method: "POST",
    url: OAUTH_URL + "/token",
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
      code: authCode,
    },
  });

  if (error) return ynabErr(error);

  return await getYNABTokenData(data as YNABTokenData);
};

export const getYNABTokenData = async (data: YNABTokenData) => {
  let newExpirDate = new Date();
  newExpirDate.setSeconds(newExpirDate.getSeconds() + data.expires_in);

  const newTokenDetails: TokenDetails = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expirationDate: newExpirDate.toISOString(),
  };

  return newTokenDetails;
};

export function GetURL_YNABAuthorizationPage(userID: string) {
  return (
    OAUTH_URL +
    "/authorize?client_id=" +
    CLIENT_ID +
    "&redirect_uri=" +
    REDIRECT_URI +
    "&response_type=code" +
    "&state=" +
    userID
  );
}

export function GetURL_YNABBudget(budgetID: string) {
  return APP_BASE_URL + "/" + budgetID.toLowerCase() + "/budget";
}

export const ynabErr = (errMsg: string) => {
  logError("YNAB Error: " + errMsg);
  return null;
};
