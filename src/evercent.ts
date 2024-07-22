import { getAutoRunData } from "./autoRun";
import { getBudget } from "./budget";
import { getCategoryData } from "./category";
import { getUserData, PayFrequency, UserData } from "./user";

export const getAllEvercentData = async (userEmail: string) => {
  const userData = await getUserData(userEmail);
  if (!userData) return;

  return {
    ...userData,
    ...getAllDataForUser(
      userData.userID,
      userData.budgetID,
      userData.payFrequency,
      userData.nextPaydate
    ),
  };
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
    categoryData,
    autoRunData,
  };
};
