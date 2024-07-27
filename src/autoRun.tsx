import React from "react";
import { log } from "./utils/log";
import { execute, query, sqlErr } from "./utils/sql";
import { find, generateUUID, getDistinctValues, sleep } from "./utils/util";
import { PayFrequency, getAmountByPayFrequency } from "./user";
import {
  Budget,
  BudgetMonth,
  BudgetMonthCategory,
  getBudget,
  getBudgetCategoryForMonth,
  updateBudgetCategoryAmount,
} from "./budget";
import {
  CategoryGroup,
  dueDateAndAmountSet,
  getPostingMonths,
} from "./category";
import { sendEmail } from "./utils/email";
import EvercentAutoRunEmail from "./component/EvercentAutoRunEmail";
import { format, parseISO } from "date-fns";
import {
  EvercentResponse,
  getAllDataForUser,
  getAllEvercentData,
  getResponse,
  getResponseError,
} from "./evercent";

export type AutoRun = {
  runID: string;
  runTime: string;
  isLocked: boolean;
  categoryGroups: AutoRunCategoryGroup[];
};

export type AutoRunCategoryGroup = {
  groupID: string;
  groupName: string;
  categories: AutoRunCategory[];
};

export type AutoRunCategory = {
  categoryGUID: string;
  categoryID: string;
  categoryName: string;
  categoryAmount: number;
  categoryExtraAmount: number;
  categoryAdjustedAmount: number;
  categoryAdjustedAmountPerPaycheck: number;
  postingMonths: AutoRunCategoryMonth[];
  included: boolean;
};

export type AutoRunCategoryMonth = {
  postingMonth: string;
  included: boolean;
  amountToPost: number;
  amountPosted?: number;
  oldAmountBudgeted?: number;
  newAmountBudgeted?: number;
};

type AutoRunDB = {
  RunID: string;
  RunTime: string;
  IsLocked: boolean;
};

type AutoRunCategoryDB = {
  RunID: string;
  CategoryGUID: string;
  CategoryGroupID: string;
  CategoryID: string;
  PostingMonth: string;
  IsIncluded: boolean;
  AmountToPost: number;
  AmountPosted: number;
  OldAmountBudgeted: number;
  NewAmountBudgeted: number;
  CategoryAmount: number;
  CategoryExtraAmount: number;
  CategoryAdjustedAmount: number;
  CategoryAdjAmountPerPaycheck: number;
};

type LockedResult = {
  runID: string;
  userEmail?: string;
  userID?: string;
  budgetID?: string;
  runTime?: string;
  categoryGUID?: string;
  categoryGroupID?: string;
  categoryID: string;
  postingMonth: string;
  amountToPost: number;
  isIncluded: boolean;
  categoryAmount: number;
  categoryExtraAmount: number;
  categoryAdjustedAmount: number;
  categoryAdjAmountPerPaycheck: number;
};

type CapitalizeKeys<T> = {
  [k in keyof T as Capitalize<string & k>]: T[k];
};

const getAutoRunCategoryGroups = (
  categoriesDB: AutoRunCategoryDB[],
  categories: CategoryGroup[],
  budgetMonths: BudgetMonth[],
  payFreq: PayFrequency,
  getPastRuns: boolean
): AutoRunCategoryGroup[] => {
  let returnGroups: AutoRunCategoryGroup[] = [];
  let returnCategories: AutoRunCategory[] = [];
  let returnPostingMonths: AutoRunCategoryMonth[] = [];

  returnGroups = [];

  // For cany categories that we aren't able to find a categoryGroupID for are ones
  // that have been hidden/deleted from the user's budget since that run.
  // This will find that groupID, so the rest of the code will work as intended,
  // as well as generate a new CategoryGUID, again just so the code will work.
  const backfilled = categoriesDB.map((c) => {
    if (!c.CategoryGroupID) {
      let foundGroupID = "";
      for (let i = 0; i < budgetMonths[0].groups.length; i++) {
        for (let j = 0; j < budgetMonths[0].groups[i].categories.length; j++) {
          if (
            budgetMonths[0].groups[i].categories[j].categoryID.toLowerCase() ==
            c.CategoryID.toLowerCase()
          ) {
            foundGroupID =
              budgetMonths[0].groups[i].categories[j].categoryGroupID;
            break;
          }
        }

        if (foundGroupID != "") {
          break;
        }
      }
      return {
        ...c,
        CategoryGUID: generateUUID().toUpperCase(),
        CategoryGroupID: foundGroupID.toUpperCase(),
      };
    }
    return c;
  });

  log("categoriesDB", backfilled);
  const groupIDs = getDistinctValues(backfilled, "CategoryGroupID");
  log("groupIDs", groupIDs);

  for (let i = 0; i < categories.length; i++) {
    const currGroup = categories[i];
    const groupID = currGroup.groupID.toLowerCase();
    if (
      groupIDs.length == 0 ||
      !groupIDs.map((g) => g?.toLowerCase()).includes(groupID)
    )
      continue;

    let groupName = currGroup.groupName;

    const categoriesForGroupDB = backfilled.filter(
      (cat) => cat.CategoryGroupID.toLowerCase() == groupID
    );
    const categoryIDs = getDistinctValues(categoriesForGroupDB, "CategoryID");

    returnCategories = [];
    for (let j = 0; j < currGroup.categories.length; j++) {
      const currCategory = currGroup.categories[j];
      const categoryID = currCategory.categoryID.toLowerCase();
      if (!categoryIDs.map((c) => c.toLowerCase()).includes(categoryID))
        continue;
      returnPostingMonths = [];

      let categoryName = currCategory.name;

      const categoriesForIDDB = categoriesForGroupDB.filter(
        (cat) => cat.CategoryID.toLowerCase() == categoryID
      );

      if (getPastRuns) {
        for (let k = 0; k < categoriesForIDDB.length; k++) {
          const categoryDB = categoriesForIDDB[k];

          returnPostingMonths.push({
            postingMonth: categoryDB.PostingMonth,
            included: true,
            amountToPost: categoryDB.AmountToPost,
            amountPosted: categoryDB.AmountPosted,
            oldAmountBudgeted: categoryDB.OldAmountBudgeted,
            newAmountBudgeted: categoryDB.NewAmountBudgeted,
          });
        }

        returnCategories.push({
          categoryGUID: categoriesForIDDB[0].CategoryGUID,
          categoryID: categoriesForIDDB[0].CategoryID,
          categoryName: categoryName,
          categoryAmount: categoriesForIDDB[0].CategoryAmount,
          categoryExtraAmount: categoriesForIDDB[0].CategoryExtraAmount,
          categoryAdjustedAmount: categoriesForIDDB[0].CategoryAdjustedAmount,
          categoryAdjustedAmountPerPaycheck:
            categoriesForIDDB[0].CategoryAdjAmountPerPaycheck,
          postingMonths: returnPostingMonths,
          included: categoriesForIDDB[0].IsIncluded,
        });
      } else {
        const evercentGroup = find(
          categories,
          (grp) => grp.groupID.toLowerCase() == groupID
        );
        const evercentCategory = find(
          evercentGroup.categories,
          (cat) => cat.categoryID.toLowerCase() == categoryID
        );

        for (let k = 0; k < evercentCategory.postingMonths.length; k++) {
          const currPM = evercentCategory.postingMonths[k];
          returnPostingMonths.push({
            postingMonth: currPM.month,
            included: categoriesForIDDB[0].IsIncluded,
            amountToPost: currPM.amount,
          });
        }

        returnCategories.push({
          categoryGUID: evercentCategory.guid,
          categoryID: evercentCategory.categoryID,
          categoryName: categoryName,
          categoryAmount: evercentCategory.amount,
          categoryExtraAmount: evercentCategory.extraAmount,
          categoryAdjustedAmount: evercentCategory.adjustedAmount,
          categoryAdjustedAmountPerPaycheck: getAmountByPayFrequency(
            evercentCategory.adjustedAmountPlusExtra,
            payFreq
          ),
          postingMonths: returnPostingMonths,
          included:
            evercentCategory.regularExpenseDetails == null
              ? true
              : evercentCategory.regularExpenseDetails.includeOnChart,
        });
      }
    }

    // If we have any past run data for categories that have since been hidden/deleted
    // from the user's budget, we'll go through one more time and make sure to add those
    // details, using the YNAB budget details gathered earlier, rather than relying on the
    // custom Evercent list of categories, since that will always exclude hidden/deleted
    // categories.
    if (getPastRuns && returnCategories.length < categoriesForGroupDB.length) {
      for (let j = 0; j < categoriesForGroupDB.length; j++) {
        const currCategory = categoriesForGroupDB[j];
        const categoryID = currCategory.CategoryID.toLowerCase();

        // If we already added this category, don't re-add it
        if (
          returnCategories.some(
            (rc) => rc.categoryID.toLowerCase() == categoryID
          )
        ) {
          continue;
        }

        const categoriesForIDDB = categoriesForGroupDB.filter(
          (cat) => cat.CategoryID.toLowerCase() == categoryID
        );

        // find the category name in the "budget" details, rather than
        // the "category" details, in the previous for loop
        let categoryName = "";
        const foundCategory = budgetMonths[0].groups
          .find(
            (g) =>
              g.categoryGroupID.toLowerCase() ==
              currCategory.CategoryGroupID.toLowerCase()
          )
          ?.categories.find((c) => c.categoryID.toLowerCase() == categoryID);
        if (foundCategory) {
          categoryName = foundCategory.name;
        }

        returnPostingMonths = [];
        for (let k = 0; k < categoriesForIDDB.length; k++) {
          const categoryDB = categoriesForIDDB[k];

          returnPostingMonths.push({
            postingMonth: categoryDB.PostingMonth,
            included: true,
            amountToPost: categoryDB.AmountToPost,
            amountPosted: categoryDB.AmountPosted,
            oldAmountBudgeted: categoryDB.OldAmountBudgeted,
            newAmountBudgeted: categoryDB.NewAmountBudgeted,
          });
        }

        returnCategories.push({
          categoryGUID: categoriesForIDDB[0].CategoryGUID,
          categoryID: categoriesForIDDB[0].CategoryID,
          categoryName,
          categoryAmount: categoriesForIDDB[0].CategoryAmount,
          categoryExtraAmount: categoriesForIDDB[0].CategoryExtraAmount,
          categoryAdjustedAmount: categoriesForIDDB[0].CategoryAdjustedAmount,
          categoryAdjustedAmountPerPaycheck:
            categoriesForIDDB[0].CategoryAdjAmountPerPaycheck,
          postingMonths: returnPostingMonths,
          included: categoriesForIDDB[0].IsIncluded,
        });
      }
    }

    returnGroups.push({
      groupID: groupID,
      groupName: groupName,
      categories: returnCategories,
    });
  }

  return returnGroups;
};

const calculateAutoRunCategoryGroups = (
  categoriesDB: AutoRunCategoryDB[],
  categories: CategoryGroup[],
  payFreq: PayFrequency
) => {
  return categories.reduce((prev, curr) => {
    const returnCategories = curr.categories.reduce((prev3, curr3) => {
      const currCategory = curr3;
      if (currCategory.adjustedAmount <= 0) return prev3;

      const returnPostingMonths = currCategory.postingMonths.reduce(
        (prev2, curr2) => {
          const currPM = curr2;
          const dbCats = categoriesDB.filter(
            (c) =>
              c.CategoryGUID?.toLowerCase() ==
                currCategory.guid.toLowerCase() &&
              c.PostingMonth &&
              new Date(currPM.month).toISOString() ==
                new Date(c.PostingMonth).toISOString()
          );

          const isIncluded = dbCats.at(0) ? dbCats[0].IsIncluded : true;

          return [
            ...prev2,
            {
              postingMonth: currPM.month,
              included: isIncluded,
              amountToPost: currPM.amount,
            },
          ];
        },
        [] as AutoRunCategoryMonth[]
      );

      return [
        ...prev3,
        {
          categoryGUID: currCategory.guid,
          categoryID: currCategory.categoryID,
          categoryName: currCategory.name,
          categoryAmount: currCategory.amount,
          categoryExtraAmount: currCategory.extraAmount,
          categoryAdjustedAmount: currCategory.adjustedAmount,
          categoryAdjustedAmountPerPaycheck: getAmountByPayFrequency(
            currCategory.adjustedAmountPlusExtra,
            payFreq
          ),
          postingMonths: returnPostingMonths,
          included:
            currCategory.regularExpenseDetails == null
              ? true
              : currCategory.regularExpenseDetails.includeOnChart,
        },
      ];
    }, [] as AutoRunCategory[]);

    if (returnCategories.length <= 0) return prev;
    return [
      ...prev,
      {
        groupID: curr.groupID,
        groupName: curr.groupName,
        categories: returnCategories,
      },
    ];
  }, [] as AutoRunCategoryGroup[]);
};

const getAutoRunDetails = (
  autoRunData: AutoRunDB[],
  autoRunCategoryData: AutoRunCategoryDB[],
  categories: CategoryGroup[],
  budgetMonths: BudgetMonth[],
  payFreq: PayFrequency,
  pastRuns: boolean
) => {
  const autoRuns = autoRunData.map((ar) => {
    const { RunID, RunTime, IsLocked } = ar;

    const autoRunCategoriesDB = autoRunCategoryData.filter(
      (arc) => arc.RunID.toLowerCase() == RunID.toLowerCase()
    );

    let autoRunCategoryGroups: AutoRunCategoryGroup[] = [];
    if (!pastRuns && !IsLocked) {
      autoRunCategoryGroups = calculateAutoRunCategoryGroups(
        autoRunCategoriesDB,
        categories,
        payFreq
      );
    } else {
      autoRunCategoryGroups = getAutoRunCategoryGroups(
        autoRunCategoriesDB,
        categories,
        budgetMonths,
        payFreq,
        pastRuns
      );
    }

    return {
      runID: RunID,
      runTime: RunTime,
      isLocked: IsLocked,
      categoryGroups: autoRunCategoryGroups,
    } as AutoRun;
  });

  return autoRuns;
};

const getAutoRunCategoriesToLock = async (results: any) => {
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

const postAmountToBudget = async (
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
  const result = await updateBudgetCategoryAmount(
    userID,
    budgetID,
    category.CategoryID,
    formattedMonth,
    newBudgeted
  );
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

const checkRegExpenseForUpdatedAmount = async (
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

const generateAutoRunResultsEmail = async (
  emailResults: any,
  userEmail: string,
  runTime: string,
  budgetMonth: BudgetMonth
) => {
  // Sort the groups by their order in YNAB,
  let sortedResults = emailResults.sort(
    (a: any, b: any) =>
      (budgetMonth as BudgetMonth).groups.findIndex(
        (cg) => cg.categoryGroupID.toLowerCase() == a.groupID.toLowerCase()
      ) -
      (budgetMonth as BudgetMonth).groups.findIndex(
        (cg) => cg.categoryGroupID.toLowerCase() == b.groupID.toLowerCase()
      )
  );
  // Then sort the categories within each of the groups based on their order in YNAB
  for (let i = 0; i < sortedResults.length; i++) {
    let currGroup = find(
      (budgetMonth as BudgetMonth).groups,
      (cg) =>
        cg.categoryGroupID.toLowerCase() ==
        sortedResults[i].groupID.toLowerCase()
    );
    sortedResults[i].categories = sortedResults[i].categories.sort(
      (a: any, b: any) =>
        currGroup.categories.findIndex(
          (c) => c.categoryID.toLowerCase() == a.categoryID.toLowerCase()
        ) -
        currGroup.categories.findIndex(
          (c) => c.categoryID.toLowerCase() == b.categoryID.toLowerCase()
        )
    );
  }

  await sendAutoRunEmail(userEmail, runTime, sortedResults);
};

const sendAutoRunEmail = async function (
  userEmail: string,
  runTime: string,
  autoRunGroups: AutoRunCategoryGroup[]
) {
  const info = await sendEmail({
    emailComponent: (
      <EvercentAutoRunEmail
        runTime={format(
          parseISO(new Date(runTime).toISOString()),
          "MM/dd/yyyy @ h:mma"
        )}
        results={autoRunGroups}
      />
    ),
    from: '"Evercent" <nblaisdell2@gmail.com>',
    to: userEmail,
    subject: "Budget Automation Results",
    attachments: [
      {
        filename: "evercent_logo.png",
        path: __dirname + "/../public/evercent_logo.png",
        cid: "logo",
      },
    ],
  });

  console.log("Message sent: %s", info.messageId);
};

export const getAutoRunCategories = (
  autoRuns: AutoRun[]
): AutoRunCategory[] => {
  if (!autoRuns[0]) return [];
  return autoRuns[0].categoryGroups.reduce((prev, curr) => {
    return [...prev, ...curr.categories];
  }, [] as AutoRunCategory[]);
};

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

export const getAutoRunData = async (
  userID: string,
  budgetID: string,
  budgetMonths: BudgetMonth[],
  payFreq: PayFrequency,
  categories: CategoryGroup[]
): Promise<
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
              payFreq,
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
    payFreq,
    false
  );

  log("GETTING AUTO RUN DETAILS - PastRuns");
  const pastRuns = getAutoRunDetails(
    queryRes.resultData[2],
    queryRes.resultData[3],
    categories,
    budgetMonths,
    payFreq,
    true
  );

  return getResponse(
    { autoRuns, pastRuns, categoryGroups: categories },
    "Got all AutoRun details for user: " + userID
  );
};

export const saveAutoRunDetails = async (
  userID: string,
  budgetID: string,
  runTime: string,
  toggledCategories: any
): Promise<EvercentResponse<boolean | null>> => {
  // TODO: Figure out format for "ToggledCategories", so we can pass it the correct
  //       object, and format it in here
  const queryRes = await execute("spEV_UpdateAutoRunDetails", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
    { name: "NewRunTime", value: runTime },
    {
      name: "ToggledCategories",
      value: toggledCategories,
    },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Could not update AutoRun details for user: " + userID
    );
  }

  return getResponse(true, "Updated AutoRun details for user: " + userID);
};

export const cancelAutoRuns = async (
  userID: string,
  budgetID: string
): Promise<EvercentResponse<boolean | null>> => {
  const queryRes = await execute("spEV_CancelAutomationRuns", [
    { name: "UserID", value: userID },
    { name: "BudgetID", value: budgetID },
  ]);
  if (sqlErr(queryRes)) {
    return getResponseError(
      "Unable to cancel upcoming AutoRuns for user: " + userID
    );
  }

  return getResponse(true, "Canceled upcoming AutoRuns for user: " + userID);
};

export const lockAutoRuns = async (): Promise<
  EvercentResponse<boolean | null>
> => {
  // 1. Get the AutoRuns to lock for this hour
  let queryRes = await query("spEV_GetAutoRunsToLock", []);
  if (sqlErr(queryRes)) {
    return getResponseError("Unable to retrieve Runs to Lock for this hour!");
  }

  // Check to see if we have any runs to lock.
  // If not, exit early here.
  if (!queryRes.resultData)
    return getResponse(true, "No AutoRuns to lock. Exiting...");

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

  return getResponse(true, "EverCent categories locked successfully!");
};

export const runAutomation = async (): Promise<
  EvercentResponse<boolean | null>
> => {
  let queryRes = await query("spEV_GetAutoRunsLocked", []);
  if (sqlErr(queryRes)) {
    return getResponseError("Could not get locked AutoRuns for this hour!");
  }

  // Check to see if we have any runs to lock.
  // If not, exit early here.
  if (!queryRes.resultData) {
    return getResponse(true, "No Locked AutoRuns found. Exiting automation...");
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

    const budgetRes = await getBudget(UserID as string, BudgetID as string);
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

  return getResponse(true, "EverCent Automation completed successfully!");
};
