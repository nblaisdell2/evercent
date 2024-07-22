import { getAutoRunData } from "./autoRun";
import { Budget, getBudget } from "./budget";
import { CategoryGroup, getCategoryData } from "./category";
import { getUserData, UserData } from "./user";
import { config } from "dotenv";
config();

console.log("I'm here!");

const res = getUserData("nblaisdell2@gmail.com").then((userData) => {
  console.log("GOT DATA!");
  userData = userData as UserData;
  console.log(userData);

  const res2 = getBudget(userData.userID, userData.budgetID).then((budget) => {
    console.log("GOT BUDGET!");
    budget = budget as Budget;
    console.log(budget);

    const res3 = getCategoryData(
      userData.userID,
      budget,
      userData.payFrequency,
      userData.nextPaydate
    ).then((categoryData) => {
      console.log("GOT CATEGORIES!");
      categoryData = categoryData as any;
      console.log(categoryData?.categoryGroups);
      console.log(categoryData?.excludedCategories);

      const autoRunData = getAutoRunData(
        userData.userID,
        userData.budgetID,
        budget.months,
        userData.payFrequency,
        categoryData?.categoryGroups as CategoryGroup[]
      ).then((autoRunData) => {
        console.log("GOT AUTO RUNS!");
        console.log(autoRunData?.autoRuns);
        console.log(autoRunData?.pastRuns);
        console.log(autoRunData?.categoryGroups);

        return "";
      });

      return "";
    });

    return "";
  });

  return "";
});

/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
/////////////////////////////////////////////////////

export * from "./user";
export * from "./budget";
export * from "./ynab";
export * from "./budget";
export * from "./category";
export * from "./autoRun";
