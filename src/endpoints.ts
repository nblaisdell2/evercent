import {
  Budget,
  BudgetMonth,
  BudgetMonthCategory,
  createBudget,
  FAKE_BUDGET_ID,
  getBudgetCategories,
  getBudgetCategoryForMonth,
  removeHiddenCategoriesFromBudget,
} from "./budget";
import {
  CategoryGroup,
  createCategoryGroupList,
  dueDateAndAmountSet,
  ExcludedCategory,
  getAllCategories,
  getExcludedCategories,
  getPostingMonths,
} from "./category";
import {
  EvercentData,
  EvercentResponse,
  getResponse,
  getResponseError,
} from "./evercent";
import {
  getNewAccessTokens,
  GetURL_YNABAuthorizationPage,
  getYNABTokenData,
  isOverRateLimitThreshold,
  TokenDetails,
  YNAB_API_URL,
  YNAB_CLIENT_ID,
  YNAB_CLIENT_SECRET,
  YNAB_OAUTH_URL,
  YNABBudget,
  YNABCategory,
  ynabErr,
  YNABTokenData,
} from "./ynab";
import { createUserData, PayFrequency, UserData } from "./user";
import { getAPIResponse } from "./utils/api";
import { log, logError } from "./utils/log";
import { execute, query, sqlErr } from "./utils/sql";
import {
  find,
  generateUUID,
  getDistinctValues,
  roundNumber,
  sleep,
} from "./utils/util";
import {
  AutoRun,
  CapitalizeKeys,
  generateAutoRunResultsEmail,
  getAutoRunCategories,
  getAutoRunDetails,
  getExcludedCategoryMonths,
  LockedResult,
} from "./autoRun";

const DEBUG = !!process.env.DEBUG;

const debug = (...args: any[]) => {
  if (DEBUG) log(args);
};

/////////////////////////////////////
/////////////// USER ////////////////
/////////////////////////////////////

export const getUserData = async ({
  userEmail,
}: {
  userEmail: string;
}): Promise<EvercentResponse<UserData | null>> => {
  log("Getting user details for email: '" + userEmail + "'");

  const queryRes = await query("spEV_GetUserData", [
    { name: "UserEmail", value: userEmail },
  ]);
  if (sqlErr(queryRes)) return getResponseError(queryRes.error);

  return getResponse(
    createUserData(queryRes.resultData),
    "Created new user: " + queryRes.resultData.UserID
  );
};

export const updateUserDetails = async function ({
  userID,
  budgetID,
  monthlyIncome,
  payFrequency,
  nextPaydate,
}: {
  userID: string;
  budgetID: string;
  monthlyIncome: number;
  payFrequency: PayFrequency;
  nextPaydate: string;
}): Promise<
  EvercentResponse<{
    monthlyIncome: number;
    payFrequency: PayFrequency;
    nextPaydate: string;
  } | null>
> {
  const queryRes = await execute("spEV_UpdateUserDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "MonthlyIncome", value: monthlyIncome },
    { name: "PayFrequency", value: payFrequency },
    { name: "NextPaydate", value: nextPaydate },
  ]);
  if (sqlErr(queryRes)) return getResponseError(queryRes.error);
  return getResponse(
    { monthlyIncome, payFrequency, nextPaydate },
    "Updated User Details for user: " + userID
  );
};

// export const updateCategoryDetails = async function (): Promise<EvercentResponse<UserData | null>> {
//   const { UserID, BudgetID, Details } = req.body;

//   const queryRes = await execute("spEV_UpdateCategoryDetails", [
//     { name: "UserID", value: UserID },
//     { name: "BudgetID", value: BudgetID },
//     { name: "Details", value: Details },
//   ]);
//   if (sqlErr(queryRes)) return;

//   // next({
//   //   data: queryRes.resultData,
//   //   message: "Categories Updated Successfully",
//   // });
// };

export const updateMonthsAheadTarget = async function ({
  userID,
  budgetID,
  newTarget,
}: {
  userID: string;
  budgetID: string;
  newTarget: number;
}): Promise<EvercentResponse<{ newTarget: number }>> {
  const queryRes = await execute("spEV_UpdateUserMonthsAheadTarget", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "NewTarget", value: newTarget },
  ]);
  if (sqlErr(queryRes)) return getResponseError(queryRes.error);
  return getResponse(
    { newTarget },
    "Updated Months Ahead Target to '" + newTarget + "' for user: " + userID
  );
};

/////////////////////////////////////
////////////// YNAB /////////////////
/////////////////////////////////////

const IGNORED_CATEGORY_GROUPS = [
  "Internal Master Category", // Used internally by YNAB, not necessary for me
  "Credit Card Payments", // Special category within YNAB which works with Credit Cards
  "Hidden Categories", // Any categories hidden by the user in their budget, don't include them
];

const updateYNABCategoryAmount = async (
  userID: string,
  budgetID: string,
  accessToken: string,
  refreshToken: string,
  categoryID: string | undefined,
  month: string | undefined,
  newBudgetedAmount: number | undefined
): Promise<YNABCategory | null> => {
  if (
    categoryID == undefined ||
    month == undefined ||
    newBudgetedAmount == undefined
  ) {
    return null;
  }

  const { data, headers, error } = await getAPIResponse({
    method: "PATCH",
    url:
      YNAB_API_URL +
      "/budgets/" +
      budgetID.toLowerCase() +
      "/months/" +
      month +
      "/categories/" +
      categoryID.toLowerCase(),
    headers: {
      Authorization: "Bearer " + accessToken,
    },
    params: {
      category: {
        budgeted: Math.floor(roundNumber(newBudgetedAmount, 2) * 1000),
      },
    },
  });

  if (error) return ynabErr(error);

  if (isOverRateLimitThreshold(headers)) {
    getRefreshedAccessTokens(userID, refreshToken);
  }

  return data.data.category as YNABCategory;
};

const getYNABBudgetsList = async (
  userID: string,
  budgetID: string,
  accessToken: string,
  refreshToken: string
): Promise<Pick<YNABBudget, "id" | "name">[] | null> => {
  const budgets = await getYNABAllBudgetsData(
    userID,
    budgetID,
    accessToken,
    refreshToken
  );

  if (!budgets) return ynabErr("Could not get budgets list");

  return budgets.map((b) => {
    return { id: b.id, name: b.name };
  });
};

const getYNABBudget = async (
  userID: string,
  budgetID: string,
  accessToken: string,
  refreshToken: string
): Promise<YNABBudget | null> => {
  return await getYNABBudgetData(userID, budgetID, accessToken, refreshToken);
};

export const YnabReq = {
  getYNABBudget,
  getYNABBudgetsList,
  updateYNABCategoryAmount,
};

export const validateTokens = async (userID: string, tokenDetails: any) => {
  let { RefreshToken, ExpirationDate } = tokenDetails;

  // If the expiration isn't past due, return the existing token details
  // and don't attempt to refresh
  if (new Date() < ExpirationDate) return tokenDetails;

  // Otherwise, if the expiration date on our tokens are past due,
  // we'll request a new access/refresh token combination
  const newTokenDetails = await getRefreshedAccessTokens(userID, RefreshToken);
  if (!newTokenDetails) return null;

  // Return the newly-refreshed tokens to use for
  // any subsequent requests
  return {
    AccessToken: newTokenDetails.accessToken,
    RefreshToken: newTokenDetails.refreshToken,
    ExpirationDate: newTokenDetails.expirationDate,
  };
};

const getYNABBudgetData = async (
  userID: string,
  budgetID: string,
  accessToken: string,
  refreshToken: string
): Promise<YNABBudget | null> => {
  if (budgetID == FAKE_BUDGET_ID) {
    budgetID = "default";
  }

  const { data, headers, error } = await getAPIResponse({
    method: "GET",
    url: YNAB_API_URL + "/budgets/" + budgetID.toLowerCase(),
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });

  if (error) return ynabErr(error);

  if (isOverRateLimitThreshold(headers)) {
    getRefreshedAccessTokens(userID, refreshToken);
  }

  let budgetData = data.data.budget as YNABBudget;

  // Filter unwanted category groups BEFORE sending back to the user, so I don't
  // have to remember to do it everywhere else
  // Keeps any hidden/deleted groups, however, in case we need the details for any
  // past runs
  budgetData.category_groups = budgetData.category_groups.filter(
    (grp) => !IGNORED_CATEGORY_GROUPS.includes(grp.name)
  );

  // Match on our groups above, but keep any hidden/deleted categories, in case we need
  // the details for any past runs
  budgetData.categories = budgetData.categories.filter((c) =>
    budgetData.category_groups.find((grp) => grp.id == c.category_group_id)
  );

  return budgetData;
};

const getYNABAllBudgetsData = async (
  userID: string,
  budgetID: string,
  accessToken: string,
  refreshToken: string
): Promise<YNABBudget[] | null> => {
  if (budgetID == FAKE_BUDGET_ID) {
    budgetID = "default";
  }

  const { data, headers, error } = await getAPIResponse({
    method: "GET",
    url: YNAB_API_URL + "/budgets",
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });

  if (error) return ynabErr(error);

  if (isOverRateLimitThreshold(headers)) {
    getRefreshedAccessTokens(userID, refreshToken);
  }

  return data.data.budgets as YNABBudget[];
};
export const getRefreshedAccessTokens = async (
  userID: string,
  refreshToken: string
): Promise<TokenDetails | null> => {
  log("Attempting to refresh access tokens");

  const { data, error } = await getAPIResponse({
    method: "POST",
    url: YNAB_OAUTH_URL + "/token",
    params: {
      client_id: YNAB_CLIENT_ID,
      client_secret: YNAB_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
  });

  if (error) {
    logError("YNAB Error", error);
    return null;
  }

  const newTokenDetails = await getYNABTokenData(data as YNABTokenData);

  // Don't await, since we can update asynchronously without needing a result.
  execute("spEV_YNAB_SaveTokenDetails", [
    { name: "UserID", value: userID },
    { name: "AccessToken", value: newTokenDetails.accessToken },
    { name: "RefreshToken", value: newTokenDetails.refreshToken },
    { name: "ExpirationDate", value: newTokenDetails.expirationDate },
  ]);

  return newTokenDetails;
};

export const ynab = async <T>(
  userID: string,
  budgetID: string,
  ynabFn: (
    userID: string,
    budgetID: string,
    accessToken: string,
    refreshToken: string,
    categoryID?: string,
    month?: string,
    newBudgetedAmount?: number
  ) => Promise<T | null>,
  categoryID?: string,
  month?: string,
  newBudgetedAmount?: number
): Promise<T | null> => {
  // First, query the DB for the user's access/refresh tokens, to ensure
  // that they are still valid before running any queries against the
  // YNAB API
  const queryRes = await query("spEV_YNAB_GetTokenDetails", [
    { name: "UserID", value: userID },
  ]);

  if (queryRes.error || !queryRes.resultData) {
    return ynabErr(
      queryRes.error || "Could not get token details from database"
    );
  }

  // Next, see if the tokens are still valid before continuing
  // If the expiration date is past due, refresh the tokens and
  // return the new tokens to use for our request
  const validatedTokens = await validateTokens(userID, queryRes.resultData);
  if (!validatedTokens) return ynabErr("Could not validate YNAB tokens");

  // Run our YNAB request, and return the data
  return await ynabFn(
    userID,
    budgetID,
    validatedTokens.AccessToken,
    validatedTokens.RefreshToken,
    categoryID,
    month,
    newBudgetedAmount
  );
};

/////////////////////////////////////
////////////// BUDGET ///////////////
/////////////////////////////////////

export const connectToYNAB = async ({
  userID,
}: {
  userID: string;
}): Promise<EvercentResponse<string>> => {
  const url = GetURL_YNABAuthorizationPage(userID);
  if (!url)
    return getResponseError(`Could not connect to budget for user: ${userID}`);

  return getResponse(url, `Got YNAB url for user: ${userID}`);
};

export const getBudget = async ({
  userID,
  budgetID,
}: {
  userID: string;
  budgetID: string;
}): Promise<EvercentResponse<Budget | null>> => {
  // Get Budget details from YNAB using their API
  const budget = await ynab(userID, budgetID, YnabReq.getYNABBudget);
  if (!budget) {
    return getResponseError(
      `Could not retrieve budget details from YNAB for user/budget: ${userID} / ${budgetID}`
    );
  }

  // If we got the YNAB Budget data, convert it into our own
  // Budget object before sending to the user
  return getResponse(createBudget(budget), "Got budget for user: " + userID);
};

export const getBudgetsList = async ({
  userID,
}: {
  userID: string;
}): Promise<EvercentResponse<Pick<YNABBudget, "id" | "name">[] | null>> => {
  const budgetsList = await ynab(
    userID,
    FAKE_BUDGET_ID,
    YnabReq.getYNABBudgetsList
  );
  if (!budgetsList) {
    return getResponseError("Could not get budgets list for user: " + userID);
  }

  return getResponse(budgetsList, "Got budgets list for user: " + userID);
};

export const switchBudget = async ({
  userID,
  newBudgetID,
}: {
  userID: string;
  newBudgetID: string;
}): Promise<EvercentResponse<{ newBudgetID: string } | null>> => {
  const budget = await ynab(userID, newBudgetID, YnabReq.getYNABBudget);
  if (!budget) {
    return getResponseError(
      `Could not switch to new budget: ${newBudgetID} (User: ${userID})`
    );
  }

  if (newBudgetID == FAKE_BUDGET_ID) newBudgetID = budget.id;

  // Convert the YNAB category format into the minimal amount
  // of data required to save the results to the database
  const newCategories = budget.categories.map((c) => {
    return {
      guid: generateUUID(),
      categoryGroupID: c.category_group_id,
      categoryID: c.id,
      amount: 0,
      extraAmount: 0,
      isRegularExpense: false,
      isUpcomingExpense: false,
    };
  });
  const strCats = JSON.stringify({ details: newCategories });

  const queryRes = await execute("spEV_UpdateInitialYNABDetails", [
    { name: "UserID", value: userID },
    { name: "NewBudgetID", value: newBudgetID },
    { name: "Details", value: strCats },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not update YNAB details in database! " + strCats
    );
  }

  return getResponse(
    { newBudgetID },
    `Switched to new budget: ${newBudgetID} (User: ${userID})`
  );
};

export const authorizeBudget = async ({
  userID,
  code,
}: {
  userID: string;
  code: string;
}): Promise<EvercentResponse<{ redirectURL: string } | null>> => {
  const newTokens = await getNewAccessTokens(code);
  if (!newTokens) {
    return getResponseError("Could not get new tokens from YNAB API");
  }

  // Save token details in DB for this user
  let sqlRes = await execute("spEV_YNAB_SaveTokenDetails", [
    { name: "UserID", value: userID },
    { name: "AccessToken", value: newTokens.accessToken },
    { name: "RefreshToken", value: newTokens.refreshToken },
    { name: "ExpirationDate", value: newTokens.expirationDate },
  ]);
  if (sqlErr(sqlRes)) {
    return getResponseError("Could not updated new tokens in database!");
  }

  await switchBudget({ userID, newBudgetID: FAKE_BUDGET_ID });

  const redirectURL = process.env.SERVER_CLIENT_BASE_URL as string;
  return getResponse(
    { redirectURL },
    "Please send the user to the redirect URL provided"
  );
};

export const updateBudgetCategoryAmount = async ({
  userID,
  budgetID,
  categoryID,
  month,
  newBudgetedAmount,
}: {
  userID: string;
  budgetID: string;
  categoryID: string;
  month: string;
  newBudgetedAmount: number;
}): Promise<EvercentResponse<{ categoryMsg: string } | null>> => {
  const updatedCategory = await ynab(
    userID,
    budgetID,
    YnabReq.updateYNABCategoryAmount,
    categoryID,
    month,
    newBudgetedAmount
  );
  if (!updatedCategory) {
    return getResponseError(
      `Could not update category amount in budget: ${budgetID} (User: ${userID})`
    );
  }

  const updateMsg = `(${userID} / ${budgetID}) // Updated amount for '${
    updatedCategory.name
  } (${categoryID})' on '${month}' to '$${Number(newBudgetedAmount).toFixed(
    2
  )}'`;
  return getResponse({ categoryMsg: updateMsg }, updateMsg);
};

/////////////////////////////////////
///////////// CATEGORY //////////////
/////////////////////////////////////

export const getCategoryData = async ({
  userID,
  budget,
  payFrequency,
  nextPaydate,
}: {
  userID: string;
  budget: Budget;
  payFrequency: PayFrequency;
  nextPaydate: string;
}): Promise<
  EvercentResponse<{
    categoryGroups: CategoryGroup[];
    excludedCategories: ExcludedCategory[];
  } | null>
> => {
  const budgetCategories = getBudgetCategories(budget.months[0]).map((bc) => {
    return {
      categoryGroupID: bc.categoryGroupID,
      categoryGroupName: bc.categoryGroupName,
      categoryID: bc.categoryID,
      name: bc.name,
      budgeted: bc.budgeted,
      activity: bc.activity,
      available: bc.available,
    };
  });
  //   log(JSON.stringify({ details: budgetCategories }));

  // ========================
  // 1. Refresh and return categories from database
  // ========================
  const queryRes = await query("spEV_GetCategoryData", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budget.id },
    { name: "Details", value: JSON.stringify({ details: budgetCategories }) },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Unable to retrieve category details from database for user: " + userID
    );
  }

  // ========================
  // 2. Assemble category list(s)
  // ========================
  const categoryDetails = createCategoryGroupList(
    queryRes.resultData[0],
    budget,
    payFrequency,
    nextPaydate
  );
  const excludedCategories = getExcludedCategories(queryRes.resultData[1]);

  return getResponse(
    {
      categoryGroups: categoryDetails,
      excludedCategories,
    },
    "Retrieved category details for user: " + userID
  );
};

const formatCategories = (
  categoryGroups: CategoryGroup[],
  excludedCategories: ExcludedCategory[]
) => {
  let formattedResults = {
    details: [] as any,
    expense: [] as any,
    upcoming: [] as any,
    excluded: [] as any,
  };

  const allCategories = getAllCategories(categoryGroups, true);
  for (let i = 0; i < allCategories.length; i++) {
    const currCat = allCategories[i];
    if (currCat) {
      const isRegularExpense = currCat.regularExpenseDetails != null;
      const isUpcomingExpense = currCat.upcomingDetails != null;

      formattedResults.details.push({
        guid: currCat.guid,
        categoryGroupID: currCat.categoryGroupID,
        categoryID: currCat.categoryID,
        amount: currCat.amount,
        extraAmount: currCat.extraAmount,
        isRegularExpense: isRegularExpense,
        isUpcomingExpense: isUpcomingExpense,
      });

      if (isRegularExpense) {
        formattedResults.expense.push({
          guid: currCat.guid,
          isMonthly: currCat.regularExpenseDetails?.isMonthly,
          nextDueDate: currCat.regularExpenseDetails?.nextDueDate,
          expenseMonthsDivisor: currCat.regularExpenseDetails?.monthsDivisor,
          repeatFreqNum: currCat.regularExpenseDetails?.repeatFreqNum,
          repeatFreqType: currCat.regularExpenseDetails?.repeatFreqType,
          includeOnChart: currCat.regularExpenseDetails?.includeOnChart,
          multipleTransactions:
            currCat.regularExpenseDetails?.multipleTransactions,
        });
      }

      if (isUpcomingExpense) {
        formattedResults.upcoming.push({
          guid: currCat.guid,
          totalExpenseAmount: currCat.upcomingDetails?.expenseAmount,
        });
      }
    }
  }

  for (let i = 0; i < excludedCategories.length; i++) {
    formattedResults.excluded.push({
      guid: excludedCategories[i]?.guid,
    });
  }

  return formattedResults;
};

export const updateCategoryDetails = async ({
  userID,
  budgetID,
  newCategories,
  excludedCategories,
}: {
  userID: string;
  budgetID: string;
  newCategories: CategoryGroup[];
  excludedCategories: ExcludedCategory[];
}): Promise<EvercentResponse<{ newCategories: CategoryGroup[] } | null>> => {
  const formattedCategories = formatCategories(
    newCategories,
    excludedCategories
  );

  const queryRes = await execute("spEV_UpdateCategoryDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "Details", value: JSON.stringify(formattedCategories) },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Unable to update category details for user: " + userID
    );
  }

  return getResponse(
    { newCategories },
    "Got category list for user: " + userID
  );
};

/////////////////////////////////////
///////////// AUTORUN ///////////////
/////////////////////////////////////

export const getAutoRunCategoriesToLock = async (results: any) => {
  let lockedResults: LockedResult[] = [];
  for (let i = 0; i < results.length; i++) {
    const { RunID, UserID, BudgetID, PayFrequency, NextPaydate } = results[i];

    const data = await getAllDataForUser(
      UserID,
      BudgetID,
      PayFrequency,
      NextPaydate
    );
    if (data.err || !data.data) return [];

    const { autoRuns } = data.data;
    const autoRunCategories = getAutoRunCategories(autoRuns);
    for (let j = 0; j < autoRunCategories.length; j++) {
      const currCat = autoRunCategories[j];

      for (let k = 0; k < currCat.postingMonths.length; k++) {
        const currMonth = currCat.postingMonths[k];

        // - Add the info to the Locked results JSON for the stored procedure
        lockedResults.push({
          runID: RunID,
          categoryID: currCat.categoryID,
          postingMonth: currMonth.postingMonth,
          amountToPost: currMonth.amountToPost,
          isIncluded: currMonth.included,
          categoryAmount: currCat.categoryAmount,
          categoryExtraAmount: currCat.categoryExtraAmount,
          categoryAdjustedAmount: currCat.categoryAdjustedAmount,
          categoryAdjAmountPerPaycheck:
            currCat.categoryAdjustedAmountPerPaycheck,
        });
      }
    }
  }

  return lockedResults;
};

export const checkRegExpenseForUpdatedAmount = async (
  userID: string,
  budgetID: string,
  budgetCategory: BudgetMonthCategory,
  category: CapitalizeKeys<LockedResult>,
  currMonth: Date
) => {
  const regDetailsRes = await query("spEV_GetRegularExpenseDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "CategoryID", value: category.CategoryID },
  ]);
  if (sqlErr(regDetailsRes)) return;

  // Check for non-monthly regular expense for updating
  // months divisor in DB for this category
  if (regDetailsRes.resultData) {
    const { IsMonthly, NextDueDate } = regDetailsRes.resultData;

    if (
      dueDateAndAmountSet(
        IsMonthly,
        NextDueDate,
        category.CategoryAmount,
        budgetCategory,
        currMonth
      )
    ) {
      log("  Updating expense months divisor");
      const cleanupQueryRes = await execute(
        "spEV_UpdateCategoryExpenseMonthsDivisor",
        [
          { name: "UserID", value: userID },
          { name: "BudgetID", value: budgetID },
          { name: "CategoryGUID", value: category.CategoryGUID },
        ]
      );
      if (sqlErr(cleanupQueryRes)) return;

      return true;
    }
  }

  return false;
};

export const postAmountToBudget = async (
  userID: string,
  budgetID: string,
  budgetCategory: BudgetMonthCategory,
  category: CapitalizeKeys<LockedResult>
) => {
  const oldBudgeted = budgetCategory.budgeted;
  const newBudgeted = oldBudgeted + category.AmountToPost;

  log("  Posting amount to YNAB budget", {
    postingMonth: category.PostingMonth,
    oldBudgeted,
    newBudgeted,
  });

  const formattedMonth = new Date(category.PostingMonth)
    .toISOString()
    .substring(0, 10);
  const result = await updateBudgetCategoryAmount({
    userID,
    budgetID,
    categoryID: category.CategoryID,
    month: formattedMonth,
    newBudgetedAmount: newBudgeted,
  });
  if (!result) return;

  log("  Result from YNAB:", result);

  // Add a record to the database for every time we post an update
  // to a user's budget categories, so we can check them again later
  await execute("spEV_AddPastAutomationResults", [
    { name: "RunID", value: category.RunID },
    { name: "CategoryID", value: category.CategoryID },
    { name: "CategoryAmount", value: category.CategoryAmount },
    { name: "CategoryExtraAmount", value: category.CategoryExtraAmount },
    {
      name: "CategoryAdjustedAmount",
      value: category.CategoryAdjustedAmount,
    },
    {
      name: "CategoryAdjAmountPerPaycheck",
      value: category.CategoryAdjAmountPerPaycheck,
    },
    { name: "PostingMonth", value: category.PostingMonth },
    { name: "OldAmountBudgeted", value: oldBudgeted },
    { name: "AmountPosted", value: category.AmountToPost },
    { name: "NewAmountBudgeted", value: newBudgeted },
  ]);

  return newBudgeted;
};

export const getAutoRunData = async ({
  userID,
  budgetID,
  budgetMonths,
  payFrequency,
  categories,
}: {
  userID: string;
  budgetID: string;
  budgetMonths: BudgetMonth[];
  payFrequency: PayFrequency;
  categories: CategoryGroup[];
}): Promise<
  EvercentResponse<{
    autoRuns: AutoRun[];
    pastRuns: AutoRun[];
    categoryGroups: CategoryGroup[];
  } | null>
> => {
  const queryRes = await query("spEV_GetAutoRunData", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not retrieve AutoRun data for user: " + userID
    );
  }

  // recalculate the posting months for each category, if the autoRuns are set
  // so that we use the correct "nextPaydate", when the user tries to calculate
  // their posting months for their next paydate, even when checking on their *current*
  // paydate.
  if (queryRes.resultData[0].at(0) != undefined) {
    categories = categories.map((cg) => {
      return {
        ...cg,
        categories: cg.categories.map((c) => {
          return {
            ...c,
            postingMonths: getPostingMonths(
              c,
              budgetMonths,
              payFrequency,
              new Date(queryRes.resultData[0][0].RunTime).toISOString()
            ),
          };
        }),
      };
    });
  }

  log("GETTING AUTO RUN DETAILS - AutoRuns");
  const autoRuns = getAutoRunDetails(
    queryRes.resultData[0],
    queryRes.resultData[1],
    categories,
    budgetMonths,
    payFrequency,
    false
  );

  log("GETTING AUTO RUN DETAILS - PastRuns");
  const pastRuns = getAutoRunDetails(
    queryRes.resultData[2],
    queryRes.resultData[3],
    categories,
    budgetMonths,
    payFrequency,
    true
  );

  return getResponse(
    { autoRuns, pastRuns, categoryGroups: categories },
    "Got all AutoRun details for user: " + userID
  );
};

export const saveAutoRunDetails = async ({
  userID,
  budgetID,
  autoRun,
}: {
  userID: string;
  budgetID: string;
  autoRun: AutoRun;
}): Promise<EvercentResponse<{ successful: boolean } | null>> => {
  const runTime = autoRun.runTime;
  const toggledCategories = getExcludedCategoryMonths(autoRun);

  const queryRes = await execute("spEV_UpdateAutoRunDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "NewRunTime", value: runTime },
    {
      name: "ToggledCategories",
      value: JSON.stringify({ toggledCategories }),
    },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not update AutoRun details for user: " + userID
    );
  }

  return getResponse(
    { successful: true },
    "Updated AutoRun details for user: " + userID
  );
};

export const cancelAutoRuns = async ({
  userID,
  budgetID,
}: {
  userID: string;
  budgetID: string;
}): Promise<EvercentResponse<{ successful: boolean } | null>> => {
  const queryRes = await execute("spEV_CancelAutomationRuns", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Unable to cancel upcoming AutoRuns for user: " + userID
    );
  }

  return getResponse(
    { successful: true },
    "Canceled upcoming AutoRuns for user: " + userID
  );
};

export const lockAutoRuns = async (): Promise<
  EvercentResponse<{ successful: boolean } | null>
> => {
  // 1. Get the AutoRuns to lock for this hour
  let queryRes = await query("spEV_GetAutoRunsToLock", []);
  if (sqlErr(queryRes)) {
    return getResponseError("Unable to retrieve Runs to Lock for this hour!");
  }

  // Check to see if we have any runs to lock.
  // If not, exit early here.
  if (!queryRes.resultData)
    return getResponse({ successful: true }, "No AutoRuns to lock. Exiting...");

  if (!Array.isArray(queryRes.resultData)) {
    queryRes.resultData = [queryRes.resultData];
  }

  // 2. Then, loop through each Run and...
  const lockedResults = await getAutoRunCategoriesToLock(queryRes.resultData);
  const strLocked = JSON.stringify({ results: lockedResults });
  // 3. Run the stored procedure for locking the results using our JSON
  queryRes = await execute("spEV_LockAutoRuns", [
    {
      name: "LockedResults",
      value: strLocked,
    },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not lock the following AutoRuns: " + strLocked
    );
  }

  return getResponse(
    { successful: true },
    "EverCent categories locked successfully!"
  );
};

export const runAutomation = async (): Promise<
  EvercentResponse<{ successful: boolean } | null>
> => {
  let queryRes = await query("spEV_GetAutoRunsLocked", []);
  if (sqlErr(queryRes)) {
    return getResponseError("Could not get locked AutoRuns for this hour!");
  }

  // Check to see if we have any runs to lock.
  // If not, exit early here.
  if (!queryRes.resultData) {
    return getResponse(
      { successful: true },
      "No Locked AutoRuns found. Exiting automation..."
    );
  }

  if (!Array.isArray(queryRes.resultData)) {
    queryRes.resultData = [queryRes.resultData];
  }

  const queryData: CapitalizeKeys<LockedResult>[] = queryRes.resultData;

  const runIDs = getDistinctValues(queryData, "RunID");
  for (let i = 0; i < runIDs.length; i++) {
    const currRunID = runIDs[i];

    let results: any[] = []; // for email
    let budgetMonth: BudgetMonth | null = null;
    let budgetCategory: BudgetMonthCategory | null = null;

    const categoryData = queryData.filter((r) => r.RunID == currRunID);
    const { UserID, UserEmail, BudgetID, RunTime } = categoryData[0];

    const budgetRes = await getBudget({
      userID: UserID as string,
      budgetID: BudgetID as string,
    });
    if (budgetRes.err || !budgetRes.data)
      return getResponseError(budgetRes.err);

    const budget = budgetRes.data;
    const categoryIDs = getDistinctValues(categoryData, "CategoryID");
    for (let j = 0; j < categoryIDs.length; j++) {
      const currCategoryID = categoryIDs[j];

      const monthData = categoryData.filter(
        (r) => r.CategoryID == currCategoryID
      );
      for (let k = 0; k < monthData.length; k++) {
        const category = monthData[k];
        if (!category.IsIncluded) continue;

        const currMonth = new Date(category.PostingMonth);
        const budgetData = getBudgetCategoryForMonth(
          budget.months,
          currMonth,
          category.CategoryGroupID as string,
          category.CategoryID
        );

        budgetMonth = budgetData.budgetMonth;
        budgetCategory = budgetData.budgetCategory;

        // Post the new amount for this category/month to the actual budget
        const postedAmount = await postAmountToBudget(
          UserID as string,
          BudgetID as string,
          budgetCategory,
          category
        );

        // Check for a non-monthly regular expense, to see if we should adjust
        // the "months divisor", if we reached our due date fully-funded
        const updatedRegExpense = await checkRegExpenseForUpdatedAmount(
          UserID as string,
          BudgetID as string,
          budgetCategory,
          category,
          currMonth
        );

        // Add data to results for email
        {
          // Adding Details for email later on
          // ============================================
          if (
            !results.some(
              (a) =>
                a.groupID.toLowerCase() ==
                budgetCategory?.categoryGroupID.toLowerCase()
            )
          ) {
            results.push({
              groupID: budgetCategory.categoryGroupID,
              groupName: budgetCategory.categoryGroupName,
              categories: [],
            });
          }

          const currGroup = find(
            results,
            (a) =>
              a.groupID.toLowerCase() ==
              budgetCategory?.categoryGroupID.toLowerCase()
          );
          if (
            !currGroup.categories.some(
              (a: any) =>
                a.categoryID.toLowerCase() ==
                budgetCategory?.categoryID.toLowerCase()
            )
          ) {
            currGroup.categories.push({
              categoryID: budgetCategory.categoryID,
              categoryName: budgetCategory.name,
              months: [],
            });
          }

          const currCat = find(
            currGroup.categories,
            (a: any) =>
              a.categoryID.toLowerCase() ==
              budgetCategory?.categoryID.toLowerCase()
          );
          if (
            !currCat.months.some(
              (a: any) => a.monthName == category.PostingMonth
            )
          ) {
            currCat.months.push({
              monthName: category.PostingMonth,
              amountPosted: category.AmountToPost,
              newAmtBudgeted: postedAmount,
            });
          }
          // ============================================
        }

        // Sleep for 2 seconds between each post to YNAB
        log("Sleeping...");
        await sleep(2000);
      }
    }

    // Run "cleanup" process after running through all category/months for this AutoRun/user
    log("Cleaning up automation for: '" + currRunID + "'");
    const cleanupQueryRes = await execute("spEV_CleanupAutomationRun", [
      { name: "RunID", value: currRunID },
    ]);
    if (sqlErr(cleanupQueryRes)) {
      return getResponseError(
        "Could not clean up AutoRun details for user: " + UserID
      );
    }

    // Send email for this AutoRun/User
    await generateAutoRunResultsEmail(
      results,
      UserEmail as string,
      RunTime as string,
      budgetMonth as BudgetMonth
    );
  }

  return getResponse(
    { successful: true },
    "EverCent Automation completed successfully!"
  );
};

/////////////////////////////////////
///////////// EVERCENT //////////////
/////////////////////////////////////

export const getAllEvercentData = async ({
  userEmail,
}: {
  userEmail: string;
}): Promise<EvercentResponse<EvercentData>> => {
  const res = await getUserData({ userEmail });
  if (res.err || !res.data) {
    return getResponseError(
      "Could not get all Evercent data for user: " + userEmail
    );
  }

  const userData = res.data;
  debug("UserData returned: " + userData);

  const dataRes = await getAllDataForUser(
    userData.userID,
    userData.budgetID,
    userData.payFrequency,
    userData.nextPaydate
  );
  if (dataRes.err || !dataRes.data) {
    return getResponseError(dataRes.err);
  }

  const data = dataRes.data;
  let allData = {
    userData,
    ...data,
  } as EvercentData;

  // Since we included "hidden" & "deleted" items, in order to account for past run
  // data where the category has since been hidden or deleted in the user's budget, but
  // we still need the data for displaying the category name and posted amounts, at this point
  // the code, just before we return it to the Evercent application, we'll adjust each of the
  // budget months to remove those hidden/deleted categories/groups, as the application expects.
  allData.budget = removeHiddenCategoriesFromBudget(allData.budget as Budget);

  return getResponse(allData, "Got ALL Evercent data for user: " + userEmail);
};

export const getAllDataForUser = async (
  userID: string,
  budgetID: string,
  payFrequency: PayFrequency,
  nextPaydate: string
): Promise<EvercentResponse<Omit<EvercentData, "userData">>> => {
  // - Get the current budget/autoRun details for this UserID/BudgetID
  const budgetRes = await getBudget({ userID, budgetID });
  if (budgetRes.err || !budgetRes.data) {
    return getResponseError(budgetRes.err);
  }

  const budget = budgetRes.data;
  debug("budget", budget);

  const categoryDataRes = await getCategoryData({
    userID,
    budget,
    payFrequency,
    nextPaydate,
  });
  if (categoryDataRes.err || !categoryDataRes.data) {
    return getResponseError(categoryDataRes.err);
  }

  const categoryData = categoryDataRes.data;
  debug("categories", categoryData.categoryGroups);

  const autoRunDataRes = await getAutoRunData({
    userID,
    budgetID,
    budgetMonths: budget.months,
    payFrequency,
    categories: categoryData.categoryGroups,
  });
  if (autoRunDataRes.err || !autoRunDataRes.data) {
    return getResponseError(autoRunDataRes.err);
  }

  const autoRunData = autoRunDataRes.data;
  return getResponse(
    {
      budget,
      ...categoryData,
      ...autoRunData,
    },
    "Got remaining Evercent data for user: " + userID
  );
};
