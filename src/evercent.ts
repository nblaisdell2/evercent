import { AutoRun, getAutoRunData } from "./autoRun";
import { Budget, getBudget } from "./budget";
import { CategoryGroup, ExcludedCategory, getCategoryData } from "./category";
import { getUserData, PayFrequency, UserData } from "./user";

export type EvercentData = {
  userData: UserData | undefined;
  budget: Budget | undefined;
  categoryGroups: CategoryGroup[];
  excludedCategories: ExcludedCategory[];
  autoRuns: AutoRun[];
  pastRuns: AutoRun[];
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
