import React from "react";
import { log } from "./utils/log";
import { find, generateUUID, getDistinctValues } from "./utils/util";
import { PayFrequency, getAmountByPayFrequency } from "./user";
import { BudgetMonth } from "./budget";
import { CategoryGroup } from "./category";
import { sendEmail } from "./utils/email";
import EvercentAutoRunEmail from "./component/EvercentAutoRunEmail";
import { format, parseISO } from "date-fns";

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

type ToggledCategory = {
  categoryGUID: string;
  postingMonth: string;
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

export type LockedResult = {
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

export type CapitalizeKeys<T> = {
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

export const getAutoRunDetails = (
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

export const generateAutoRunResultsEmail = async (
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

export const getExcludedCategoryMonths = (
  autoRun: AutoRun
): ToggledCategory[] => {
  let toggledCategories: ToggledCategory[] = [];

  const categories = getAutoRunCategories([autoRun]);
  for (let i = 0; i < categories.length; i++) {
    const months = categories[i].postingMonths;

    for (let j = 0; j < months.length; j++) {
      const month = months[j];

      if (!month.included) {
        toggledCategories.push({
          categoryGUID: categories[i].categoryGUID,
          postingMonth: month.postingMonth,
        });
      }
    }
  }

  return toggledCategories;
};

///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
