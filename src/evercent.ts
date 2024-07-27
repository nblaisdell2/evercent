import { AutoRun, getAutoRunData } from "./autoRun";
import { Budget, getBudget, removeHiddenCategoriesFromBudget } from "./budget";
import { CategoryGroup, ExcludedCategory, getCategoryData } from "./category";
import { getUserData, PayFrequency, UserData } from "./user";

export type EvercentData = {
  userData: UserData | null;
  budget: Budget | null;
  categoryGroups: CategoryGroup[];
  excludedCategories: ExcludedCategory[];
  autoRuns: AutoRun[];
  pastRuns: AutoRun[];
};

export type EvercentResponse<T> = {
  data: T | null;
  message: string | undefined | null;
  err: string | undefined | null;
};

export const getResponseError = <T>(
  err?: string | undefined | null
): EvercentResponse<T> => {
  return {
    data: null,
    message: err,
    err,
  };
};

export const getResponse = <T>(
  data: T,
  message?: string | undefined | null
): EvercentResponse<T> => {
  return {
    data,
    message,
    err: null,
  };
};

export const getAllEvercentData = async (
  userEmail: string
): Promise<EvercentResponse<EvercentData>> => {
  const res = await getUserData(userEmail);
  if (res.err || !res.data) {
    return getResponseError(
      "Could not get all Evercent data for user: " + userEmail
    );
  }

  const userData = res.data;
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
  const budgetRes = await getBudget(userID, budgetID);
  if (budgetRes.err || !budgetRes.data) {
    return getResponseError(budgetRes.err);
  }

  // log("budget", budget);

  const budget = budgetRes.data;
  const categoryDataRes = await getCategoryData(
    userID,
    budget,
    payFrequency,
    nextPaydate
  );
  if (categoryDataRes.err || !categoryDataRes.data) {
    return getResponseError(categoryDataRes.err);
  }

  // log("categories", categoryData.categoryGroups);
  const categoryData = categoryDataRes.data;
  const autoRunDataRes = await getAutoRunData(
    userID,
    budgetID,
    budget.months,
    payFrequency,
    categoryData.categoryGroups
  );
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
