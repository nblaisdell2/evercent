import { AutoRun, getAutoRunData } from "./autoRun";
import { Budget, getBudget } from "./budget";
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

export const getAllEvercentData = async (userEmail: string) => {
  const userData = await getUserData(userEmail);
  if (!userData) return;

  const data = await getAllDataForUser(
    userData.userID,
    userData.budgetID,
    userData.payFrequency,
    userData.nextPaydate
  );

  let allData = {
    userData,
    ...data,
  } as EvercentData;

  // Since we included "hidden" & "deleted" items, in order to account for past run
  // data where the category has since been hidden or deleted in the user's budget, but
  // we still need the data for displaying the category name and posted amounts, at this point
  // the code, just before we return it to the Evercent application, we'll adjust each of the
  // budget months to remove those hidden/deleted categories/groups, as the application expects.
  allData.budget = {
    ...allData.budget,
    months: allData?.budget?.months.map((m) => {
      return {
        ...m,
        groups: m.groups
          .filter((g) => !g.hidden && !g.deleted)
          .map((g) => {
            return {
              ...g,
              categories: g.categories.filter((c) => !c.hidden && !c.deleted),
            };
          }),
      };
    }),
  } as Budget;

  return allData;
};

export const getAllDataForUser = async (
  userID: string,
  budgetID: string,
  payFrequency: PayFrequency,
  nextPaydate: string
) => {
  // - Get the current budget/autoRun details for this UserID/BudgetID
  const budget = await getBudget(userID, budgetID);
  if (!budget) return;

  // log("budget", budget);

  const categoryData = await getCategoryData(
    userID,
    budget,
    payFrequency,
    nextPaydate
  );
  if (!categoryData) return;

  // log("categories", categoryData.categoryGroups);

  const autoRunData = await getAutoRunData(
    userID,
    budgetID,
    budget.months,
    payFrequency,
    categoryData.categoryGroups
  );
  if (!autoRunData) return;

  return {
    budget,
    ...categoryData,
    ...autoRunData,
  };
};
