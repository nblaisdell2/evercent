import { parseISO } from "date-fns";

import {
  getAPIData,
  getMoneyString,
  getShortDate,
  treatAsUTC,
  merge,
  daysBetween,
} from "./utils";

import * as ynab from "./ynab";
import data from "./data.json";

// **************************
//   User Details Functions
// **************************
async function getUserDetailsFromDB(userEmail, cookies) {
  let preUserDetails = {};
  let preAutoRuns = [];
  let preUserCategories = [];

  let dbData = null;
  try {
    let allCookies = cookies.getAll();
    delete allCookies["appSession"];

    dbData = await getAPIData(data.Queries.GET_USER_DETAILS, {
      UserEmail: userEmail,
      ExistingData: JSON.stringify(allCookies),
    });

    if (dbData.length > 0) {
      preUserDetails = dbData[0][0];

      if (dbData[1]) {
        preAutoRuns = dbData[1];
      }

      if (dbData[2]) {
        preUserCategories = dbData[2];
      }
    }
  } catch (err) {
    console.log(err);
  }

  if (!preUserDetails.MonthlyAmount) {
    preUserDetails.MonthlyAmount = 0;
  }
  if (!preUserDetails.MonthsAheadTarget) {
    preUserDetails.MonthsAheadTarget = 6;
  }
  if (!preUserDetails.PayFrequency) {
    preUserDetails.PayFrequency = "Every 2 Weeks";
  }
  if (!preUserDetails.NextPaydate) {
    preUserDetails.NextPaydate = new Date().toISOString();
  }

  preUserDetails.UnsavedChanges = false;

  console.log("preAutoRuns from database");
  console.log(preAutoRuns);

  return [preUserDetails, preAutoRuns, preUserCategories];
}

async function getUserDetailsFromCookies(cookies) {
  // Get user details from session storage
  let newUserDetails = {};
  let newUserCategoryList = [];

  let monthlyAmt = cookies.get(data.MyCookies.MONTHLY_AMOUNT);
  newUserDetails.MonthlyAmount = monthlyAmt ? parseInt(monthlyAmt) : 0;

  let monthsAheadTarget = cookies.get(data.MyCookies.MONTHS_AHEAD_TARGET);
  newUserDetails.MonthsAheadTarget = monthsAheadTarget
    ? parseInt(monthsAheadTarget)
    : 6;

  let payFreq = cookies.get(data.MyCookies.PAY_FREQUENCY);
  newUserDetails.PayFrequency = payFreq || "Every 2 Weeks";

  let nextPaydate = cookies.get(data.MyCookies.NEXT_PAYDATE);
  newUserDetails.NextPaydate = nextPaydate || new Date().toISOString();

  newUserDetails.UnsavedChanges = false;

  let existingTokens = {
    accessToken: cookies.get(data.MyCookies.ACCESS_TOKEN),
    expirationDate: cookies.get(data.MyCookies.EXPIRATION_DATE),
    refreshToken: cookies.get(data.MyCookies.REFRESH_TOKEN),
    defaultBudgetID: cookies.get(data.MyCookies.DEFAULT_BUDGET_ID),
  };

  if (
    existingTokens.accessToken !== null &&
    existingTokens.accessToken !== undefined
  ) {
    newUserDetails.AccessToken = existingTokens.accessToken;
    newUserDetails.ExpirationDate = existingTokens.expirationDate;
    newUserDetails.RefreshToken = existingTokens.refreshToken;
    newUserDetails.DefaultBudgetID = existingTokens.defaultBudgetID;
  }

  return [newUserDetails, newUserCategoryList];
}

export async function getUpcomingDetails(categoryList, frequency, nextPaydate) {
  let upcomingDetails = {};
  upcomingDetails.extraAmount = 0;
  upcomingDetails.selectedCategory = null;

  let allCats = getAllCategories(categoryList);
  upcomingDetails.categories = allCats.filter(
    (x) => x.upcomingExpense !== null
  );

  for (let i = 0; i < upcomingDetails.categories.length; i++) {
    let currCat = upcomingDetails.categories[i];
    currCat.extraDetails = calculateUpcomingExpensesForCategory(
      currCat,
      nextPaydate,
      frequency,
      0
    );
  }

  return upcomingDetails;
}

export async function getSixMonthTargetMetCount(categories, monthsAheadTarget) {
  let targetMetCount = 0;

  for (let i = 0; i < categories.length; i++) {
    let currCat = categories[i];
    currCat.monthsAhead = 0;

    if (mthDetails.length > 0) {
      let monthCat = null;
      if (currCat.categoryAmount > 0) {
        if (currCat.expenseType == "Monthly") {
          monthCat = mthDetails[0].categories.find(
            (x) =>
              x.category_group_id == currCat.categoryGroupID &&
              x.id == currCat.id
          );
          currCat.monthsAhead =
            Math.floor(monthCat.balance / 1000 / currCat.categoryAmount) - 1;
        } else {
          for (let j = mthDetails.length - 2; j >= 0; j--) {
            monthCat = mthDetails[j].categories.find(
              (x) =>
                x.category_group_id == currCat.categoryGroupID &&
                x.id == currCat.id
            );

            let catAmt = currCat.categoryAmount / currCat.expenseMonthsDivisor;
            if (monthCat.budgeted / 1000 >= catAmt) {
              currCat.monthsAhead += 1;
            }
          }
        }

        if (currCat.monthsAhead >= monthsAheadTarget) {
          targetMetCount += 1;
        }
      }
    }
  }

  return targetMetCount;
}

export async function setYnabSixMonthDetails(categoryList, monthsAheadTarget) {
  let sixMoDt = {
    monthsAheadTarget: monthsAheadTarget,
  };

  let newCats = [];
  let sixCats = [...categoryList];
  for (let i = 0; i < sixCats.length; i++) {
    let currCats = sixCats[i].categories.filter((x) => x.expenseType !== null);
    for (let j = 0; j < currCats.length; j++) {
      currCats[j].balance = getLatestBalance(currCats[j].id);
    }
    newCats.push(...currCats);
  }

  sixMoDt.categories = newCats;

  sixMoDt.targetMetCount = await getSixMonthTargetMetCount(
    newCats,
    monthsAheadTarget
  );

  return { ...sixMoDt };
}

async function getFormattedCategoryList(preYNABCategories, preUserCategories) {
  let newUserList = [];
  let newUserListItem = {};
  for (let i = 0; i < preYNABCategories.length; i++) {
    let currGroup = preYNABCategories[i];
    let dbGroup = preUserCategories.filter(
      (x) => x.id == currGroup.id || x.CategoryGroupID == currGroup.id
    );
    if (dbGroup.length > 0) {
      newUserListItem = {
        id: currGroup.id,
        name: currGroup.name,
        isExpanded: false,
        isSelected: false,
        categories: [],
      };
      for (let j = 0; j < currGroup.categories.length; j++) {
        let foundCat = currGroup.categories[j];
        let catGroup = dbGroup.find(
          (x) => x.CategoryID == currGroup.categories[j].id
        );
        if (catGroup) {
          newUserListItem.categories.push({
            id: foundCat.id,
            categoryGroupID: foundCat.categoryGroupID,
            name: foundCat.name,
            categoryAmount: catGroup.CategoryAmount,
            extraAmount: catGroup.ExtraAmount,
            expenseType: catGroup.ExpenseType,
            includeOnChart: catGroup.IncludeOnChart,
            upcomingExpense: catGroup.UpcomingExpense,
            expenseDate: catGroup.ExpenseDate,
            expenseMonthsDivisor: catGroup.ExpenseMonthsDivisor,
            repeatFreqNum: catGroup.RepeatFreqNum,
            repeatFreqType: catGroup.RepeatFreqType,
            useCurrentMonth: catGroup.UseCurrentMonth,
            toggleInclude: catGroup.ToggleInclude,
          });
        }
      }
      newUserList.push(newUserListItem);
    }
  }

  newUserList = await getOrderedCategoryList(newUserList, preYNABCategories);

  return newUserList;
}

// *******************
//   YNAB Functions
// *******************
async function connectToYNAB(userEmail, authCode) {
  return await ynab
    .GetNewAccessToken(authCode)
    .then((response) => {
      let accessToken = response.access_token;
      let newExpirDate = new Date();
      newExpirDate.setSeconds(newExpirDate.getSeconds() + response.expires_in);

      if (userEmail) {
        getAPIData(data.Queries.ADD_YNAB_ACCESS_TOKEN, {
          UserEmail: userEmail,
          AccessToken: accessToken,
          ExpiresIn: response.expires_in,
          RefreshToken: response.refresh_token,
        });
      }

      return {
        userEmail: userEmail || null,
        AccessToken: accessToken,
        RefreshToken: response.refresh_token,
        ExpirationDate: newExpirDate.toISOString(),
      };
    })
    .then(async (tokens) => {
      let budgetID = await ynab
        .GetBudgetID(tokens.AccessToken)
        .then((response) => {
          if (userEmail) {
            getAPIData(data.Queries.UPDATE_DEFAULT_BUDGET_ID, {
              UserEmail: tokens.userEmail,
              BudgetID: response,
            });
          }

          return response;
        });

      return { ...tokens, DefaultBudgetID: budgetID };
    });
}

async function getYNABDetailsFromAPI(preUserDetails, preUserCategories) {
  let preYNABMonthDetails = [];
  let preYNABCategories = [];

  // console.log("what are the current details?");
  // console.log(preUserDetails);

  if (preUserDetails.AccessToken && preUserDetails.DefaultBudgetID) {
    preUserDetails = await checkYNABRefreshToken(preUserDetails);

    preYNABMonthDetails = await getYNABBudgetMonths(preUserDetails.AccessToken);

    preYNABCategories = await getAllYNABBudgetCategories(
      preUserDetails.AccessToken,
      preUserCategories
    );

    if (preUserDetails.UserID) {
      // console.log("YNAB API Details - Before");
      // console.log(preUserCategories);
      preUserCategories = await getFormattedCategoryList(
        preYNABCategories,
        preUserCategories
      );
      // console.log("YNAB API Details - After");
      // console.log(preUserCategories);
    } else {
      preUserCategories.map((x) => {
        x.isExpanded = false;
        return x;
      });
    }
  }

  return [
    preYNABMonthDetails,
    preYNABCategories,
    preUserCategories,
    preUserDetails,
  ];
}

async function checkYNABRefreshToken(preUserDetails) {
  // console.log(preUserDetails.ExpirationDate);
  // console.log("Now (Parse):   ", new Date());
  // console.log("Expir (Prase): ", parseISO(preUserDetails.ExpirationDate));
  // console.log("Expir (UTC):   ", treatAsUTC(preUserDetails.ExpirationDate));

  if (
    (preUserDetails.UserID &&
      new Date() > treatAsUTC(preUserDetails.ExpirationDate)) ||
    new Date() > parseISO(preUserDetails.ExpirationDate)
  ) {
    console.log("Expiration Date PAST DUE!");
    // Get a new access token
    return await ynab
      .GetNewAccessTokenRefresh(preUserDetails.RefreshToken)
      .then((response) => {
        if (preUserDetails.UserEmail) {
          getAPIData(data.Queries.UPDATE_YNAB_ACCESS_TOKEN, {
            UserEmail: preUserDetails.UserEmail,
            AccessToken: response.accToken,
            ExpiresIn: response.expireSeconds,
            RefreshToken: response.refToken,
          });
        }

        let newUserDetails = { ...preUserDetails };
        newUserDetails.AccessToken = response.accToken;
        newUserDetails.RefreshToken = response.refToken;
        newUserDetails.ExpirationDate = response.expirationDate;

        return newUserDetails;
      })
      .catch((err) => {
        console.log("Error checking tokens", err);
      });
  }

  return preUserDetails;
}

async function getYNABBudgetMonths(accToken) {
  console.log("getYNABBudgetMonths - What is the access token?");
  console.log(accToken);

  return await ynab.GetAllBudgetMonths(accToken).then((response) => {
    // console.log("My reponse");
    // console.log(response);
    let monthDetails = response.data.budget.months;

    let today = new Date();
    today.setDate(1);
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    let newMonthDetails = [];
    for (let i = monthDetails.length - 1; i >= 0; i--) {
      let ynMonth = new Date(monthDetails[i].month);

      if (
        monthDetails[i].budgeted > 0 ||
        ynMonth.getFullYear() > today.getFullYear() ||
        (ynMonth.getFullYear() == today.getFullYear() &&
          ynMonth.getMonth() + 1 >= today.getMonth() + 1)
      ) {
        newMonthDetails.push(monthDetails[i]);
      }
    }

    return newMonthDetails;
  });
}

async function getAllYNABBudgetCategories(accToken, preUserCategories) {
  return await ynab.GetAllCategories(accToken).then((response) => {
    return getValidYNABCategories(
      response.data.category_groups,
      preUserCategories
    );
  });
}

async function getValidYNABCategories(catGroups, preUserCategories) {
  // console.log("Getting valid ynab categories");
  // console.log(preUserCategories);

  const unwantedCategories = [
    "Internal Master Category",
    "Credit Card Payments",
    "Hidden Categories",
  ];

  // Removing any unwanted categories before sending back to the client
  let newCategories = [];
  for (let i = 0; i < catGroups.length; i++) {
    if (!unwantedCategories.includes(catGroups[i].name)) {
      let currCatGroup = catGroups[i];
      let newCatGroup = {};
      let categoryList = [];
      if (!currCatGroup.hidden && !currCatGroup.deleted) {
        newCatGroup.id = currCatGroup.id;
        newCatGroup.name = currCatGroup.name;

        let currCategory = null;
        for (let j = 0; j < currCatGroup.categories.length; j++) {
          currCategory = currCatGroup.categories[j];

          if (!currCategory.hidden && !currCategory.deleted) {
            categoryList.push({
              id: currCategory.id,
              categoryGroupID: currCategory.category_group_id,
              name: currCategory.name,
              inUserList:
                preUserCategories?.filter(
                  (x) => x.CategoryID == currCategory.id
                ).length > 0,
            });
          }
        }

        newCatGroup.categories = categoryList;
        newCategories.push(newCatGroup);
      }
    }
  }

  return newCategories;
}

export async function getOrderedCategoryList(userCategoryList, ynabList) {
  let orderedUserList = [];
  let orderedCatList = [];
  for (let i = 0; i < ynabList.length; i++) {
    let savedGroup = userCategoryList.find((x) => x.id == ynabList[i].id);
    if (savedGroup) {
      console.log("Saved Group? ", savedGroup);
      orderedCatList = [];

      for (let j = 0; j < ynabList[i].categories.length; j++) {
        let savedCat = savedGroup.categories.find(
          (x) => x.id == ynabList[i].categories[j].id
        );
        if (savedCat) {
          orderedCatList.push(savedCat);
        }
      }

      savedGroup.categories = orderedCatList;
      orderedUserList.push(savedGroup);
    }
  }

  return orderedUserList;
}

export async function getPreloadedData(userEmail, ynabAuthCode, cookies) {
  console.log("What is my user?");
  console.log(userEmail);

  let reload = false;
  let preConnectTokens = {};

  // First, check to see if the URL contains the "code" query parameter.
  //   If it does, that means we just returned from connecting to YNAB for
  //   the first time. In that case, we should get an Access/Refresh token
  //   from the YNAB API, and store the results in the database if the user is logged in
  if (ynabAuthCode) {
    console.log("Connecting to YNAB...");
    console.log(ynabAuthCode);

    preConnectTokens = await connectToYNAB(userEmail, ynabAuthCode);
    console.log(preConnectTokens);
    reload = true;
  }

  let preUserDetails = {};
  let preAutoRuns = [];
  let preUserCategories = [];
  let preSixMonthDetails = {};
  let preUpcomingDetails = {};
  let preYNABMonthDetails = [];
  let preYNABCategories = [];

  // If we have a user email, that means that the user is now logged in
  // If so, let's pull their information directly from the database
  //   This path will handle for a new or existing login user
  if (userEmail) {
    [preUserDetails, preAutoRuns, preUserCategories] =
      await getUserDetailsFromDB(userEmail, cookies);
  } else {
    // If there's no email, that means that nobody is logged in currently
    console.log("Getting user details from cookies");
    [preUserDetails, preUserCategories] = await getUserDetailsFromCookies(
      cookies
    );
    console.log(preUserDetails);
    console.log(preUserCategories);
  }

  // //   If we have any "preConnectTokens", that means that the user is trying
  // //   to connect to YNAB, even though they are not logged in, so let's manually
  // //   set the userDetails with those tokens here.
  // console.log("What are my preConnectTokens?");
  // console.log(preConnectTokens);
  if (Object.keys(preConnectTokens).length > 0) {
    preUserDetails.AccessToken = preConnectTokens.AccessToken;
    preUserDetails.RefreshToken = preConnectTokens.RefreshToken;
    preUserDetails.ExpirationDate = preConnectTokens.ExpirationDate;
    preUserDetails.DefaultBudgetID = preConnectTokens.DefaultBudgetID;
  }

  // Get ynab month details from "YNAB"
  //   1) Month Details - Contains the budget categories & amounts for each month in YNAB
  //   2) Categories    - List of current budget categories
  [preYNABMonthDetails, preYNABCategories, preUserCategories, preUserDetails] =
    await getYNABDetailsFromAPI(preUserDetails, preUserCategories);

  // console.log("Getting user details from cookies - AFTER YNAB");
  // console.log(preUserDetails);
  // console.log(preUserCategories);

  // Pre-calculate the "six month details" using the category details
  // from YNAB and the database above
  preSixMonthDetails = await setYnabSixMonthDetails(
    preUserCategories,
    preUserDetails.MonthsAheadTarget
  );

  // Pre-calculate the "upcoming details" using the category details
  // from YNAB and the database above
  console.log("About to precalculate upcoming details");
  console.log(preUserDetails.PayFrequency);
  console.log(preUserDetails.NextPaydate);
  preUpcomingDetails = await getUpcomingDetails(
    preUserCategories,
    preUserDetails.PayFrequency,
    preUserDetails.NextPaydate
  );

  return {
    props: {
      preUserDetails: preUserDetails,
      preAutoRuns: preAutoRuns,
      preUserCategories: preUserCategories,
      preSixMonthDetails: preSixMonthDetails,
      preUpcomingDetails: preUpcomingDetails,
      preYNABMonthDetails: preYNABMonthDetails,
      preYNABCategories: preYNABCategories,
      preConnectTokens: preConnectTokens,
      reload: reload,
    },
  };
}

function addCategoryGroupToUserList(
  userList,
  ynabList,
  catGroupID,
  isExpanded,
  isSelected
) {
  try {
    let idx = userList.indexOf(userList.find((x) => x.id == catGroupID));
    if (idx == -1) {
      userList.push({
        id: catGroupID,
        name: ynabList.find((x) => x.id == catGroupID).name,
        isExpanded: isExpanded,
        isSelected: isSelected,
        categories: [],
      });
    }
    // else {
    //   console.log("Category Group already exists in userList");
    //   console.log(userList);
    //   console.log(catGroupID);
    // }
  } catch (err) {
    console.log("GroupID: ", catGroupID);
    console.log("User List: ", userList);
    console.log(err);
    // console.err(err);
  }
}

function createCategory(catGroupID, catID, ynabList) {
  let catName = ynabList
    .find((x) => x.id == catGroupID)
    .categories.find((x) => x.id == catID).name;
  return {
    id: catID,
    categoryGroupID: catGroupID,
    name: catName,
    categoryAmount: 0,
    extraAmount: 0,
    balance: 0,
    expenseDate: null,
    expenseMonthsDivisor: null,
    expenseType: null,
    includeOnChart: true,
    monthsAhead: -1,
    repeatFreqNum: 1,
    repeatFreqType: "Months",
    toggleInclude: false,
    upcomingExpense: null,
    useCurrentMonth: false,
  };
}

export function addCategory(userList, ynabList, catGroupID, catID) {
  let currCatGroup = userList.find((x) => x.id == catGroupID);
  if (!currCatGroup) {
    addCategoryGroupToUserList(userList, ynabList, catGroupID, false, false);
    currCatGroup = userList.find((x) => x.id == catGroupID);
  }

  let cats = currCatGroup.categories;
  let existing = cats.find((x) => x.id == catID);
  if (!existing) {
    cats.push(createCategory(catGroupID, catID, ynabList));
  }
  // else {
  //   // console.log("Category has already been added to this userList");
  //   // console.log(userList);
  // }
}

export function removeCategory(userList, catGroupID, catID) {
  console.log("About to try to removeCategory");
  console.log("userList", userList);
  console.log("catGroupID", catGroupID);
  console.log("catID", catID);

  let cats = userList.find((x) => x.id == catGroupID).categories;
  console.log("What is cats?");
  console.log(cats);

  if (cats && cats.length > 0) {
    let remIdx = cats.indexOf(cats.find((x) => x.id == catID));
    if (remIdx > -1) {
      console.log("Removing category in function");
      cats.splice(remIdx, 1);
      console.log("List after being removed:", cats);
      console.log("userList", userList);
    }

    if (cats.length == 0) {
      console.log("No more categories in group. Removing group, as well.");
      userList.splice(
        userList.indexOf(userList.find((x) => x.id == catGroupID)),
        1
      );
      console.log("userList", userList);
    }
  }
}

export function getGrandTotal(userList) {
  let newGrandTotal = 0;
  for (let i = 0; i < userList.length; i++) {
    for (let j = 0; j < userList[i].categories.length; j++) {
      let catAmt = getCategoryAmountModified(userList[i].categories[j]);

      newGrandTotal += catAmt;
    }
  }

  return newGrandTotal;
}

export function replaceCategory(userList, newCat) {
  let newUserList = userList;
  let foundChange = false;
  for (let i = 0; i < newUserList.length; i++) {
    if (newUserList[i].id == newCat.categoryGroupID) {
      for (let j = 0; j < newUserList[i].categories.length; j++) {
        if (newUserList[i].categories[j].id == newCat.id) {
          newUserList[i].categories[j] = newCat;
          foundChange = true;
          break;
        }
      }
    }

    if (foundChange) {
      break;
    }
  }
}

/***********************************/

export function advanceDateByFrequency(dateIn, freq) {
  let dtTemp = new Date(dateIn);
  switch (freq) {
    case "Every Week":
      dtTemp = new Date(dtTemp.setDate(dtTemp.getDate() + 7));
      break;
    case "Every 2 Weeks":
      dtTemp = new Date(dtTemp.setDate(dtTemp.getDate() + 14));
      break;
    case "Monthly":
      dtTemp = new Date(dtTemp.setMonth(dtTemp.getMonth() + 1));
      break;
    default:
      break;
  }

  return dtTemp;
}

export function getFutureAutoDateList(startDate, frequency, numIters) {
  let newAutoRunList = [];
  for (let i = 0; i < numIters; i++) {
    newAutoRunList.push({
      RunTime: startDate.toISOString(),
      Frequency: frequency,
    });

    startDate = advanceDateByFrequency(startDate, frequency);
  }

  return newAutoRunList;
}

function getNewListItem(key, id, isParent, isExpanded, props) {
  return {
    key: key,
    id: id,
    isParent: isParent,
    isExpanded: isExpanded,
    ...props,
  };
}

export function getCategoryListItems(userCategoryList, monthlyAmount) {
  let listItems = [];
  let newItem = {};
  for (let i = 0; i < userCategoryList.length; i++) {
    let currItem = userCategoryList[i];
    let groupTotalModified = currItem.categories.reduce((a, b) => {
      return a + getCategoryAmountModified(b);
    }, 0);

    newItem = getNewListItem(
      currItem.id,
      currItem.id,
      true,
      currItem.isExpanded,
      {
        category: currItem.name,
        amount: getMoneyString(groupTotalModified),
        amountNum: groupTotalModified,
        percentIncome:
          (monthlyAmount == 0
            ? 0
            : Math.round((groupTotalModified / monthlyAmount) * 100)) + "%",
        isRegular: null,
        isUpcoming: null,
        fullCategory: null,
      }
    );
    listItems.push(newItem);

    for (let j = 0; j < currItem.categories.length; j++) {
      let currCat = currItem.categories[j];
      let catAmtMod = getCategoryAmountModified(currCat);
      let showOther = currCat.categoryAmount !== catAmtMod;

      newItem = getNewListItem(
        currCat.id,
        currCat.id,
        false,
        currItem.isExpanded,
        {
          category: currCat.name,
          amount: !showOther
            ? getMoneyString(catAmtMod, 2)
            : getMoneyString(catAmtMod, 2) +
              " / (" +
              getMoneyString(currCat.categoryAmount) +
              ")",
          amountNum: showOther ? catAmtMod : currCat.categoryAmount,
          percentIncome:
            (monthlyAmount == 0
              ? 0
              : (catAmtMod / monthlyAmount) * 100
            ).toFixed(2) + "%",
          isRegular: currCat.expenseType !== null,
          isUpcoming: currCat.upcomingExpense !== null,
          fullCategory: currCat,
        }
      );
      listItems.push(newItem);
    }
  }
  return listItems;
}

export function getAllCategories(userCategoryList) {
  return merge(userCategoryList, "categories");
}

export function getNextPaydate(currPaydate, freq) {
  let dtWithTime = new Date();
  dtWithTime.setHours(0, 0, 0, 0);

  let dayOfWeek = currPaydate;
  let dayOfMonth = currPaydate;

  if (freq == "Every Week" || freq == "Every 2 Weeks") {
    let weekNum = 0;
    switch (dayOfWeek) {
      case "Sun":
        weekNum = 0;
        break;
      case "Mon":
        weekNum = 1;
        break;
      case "Tue":
        weekNum = 2;
        break;
      case "Wed":
        weekNum = 3;
        break;
      case "Thu":
        weekNum = 4;
        break;
      case "Fri":
        weekNum = 5;
        break;
      case "Sat":
        weekNum = 6;
        break;
      default:
        break;
    }

    let daysToAdd = weekNum - dtWithTime.getDay();
    if (daysToAdd < 0) {
      daysToAdd += 7;
    } else if (daysToAdd == 0 && dtWithTime < new Date()) {
      daysToAdd += 7;
    }

    dtWithTime = new Date(dtWithTime.setDate(dtWithTime.getDate() + daysToAdd));
  } else if (freq == "Monthly") {
    let dtTemp = new Date();
    if (dtTemp.getDate() > dayOfMonth) {
      dtTemp = new Date(dtTemp.setMonth(dtTemp.getMonth() + 1));
      dtTemp = new Date(dtTemp.setDate(dayOfMonth));
    } else {
      dtTemp = new Date(dtTemp.setDate(dayOfMonth));
    }
    dtWithTime = dtTemp;
    dtWithTime.setHours(0, 0, 0, 0);
  }

  return dtWithTime;
}

export function calculateUpcomingExpensesForCategory(
  cat,
  nextPaydate,
  payFreq,
  extraAmt = 0
) {
  // console.log("Getting purchase date for ", cat.name);
  // console.log(cat);
  // console.log("payFreq", payFreq);

  let ynabLatestBalance = getLatestBalance(cat.id);
  // console.log("latest YNAB balance", ynabLatestBalance);

  let totalPurchaseAmt = cat.upcomingExpense - ynabLatestBalance;
  let amtPerPaycheck = getAmountByFrequency(cat.categoryAmount, payFreq);

  // console.log("totalPurchaseAmt", totalPurchaseAmt);
  // console.log("amtPerPaycheck", amtPerPaycheck);

  let dtWithTime = parseISO(nextPaydate); //getNextPaydate(nextPaydate, payFreq);
  // console.log("Starting date", dtWithTime.toISOString());

  let newAutoRunList = [];
  do {
    totalPurchaseAmt -= amtPerPaycheck + extraAmt;
    // console.log("new totalPurchaseAmt", totalPurchaseAmt);

    // console.log("About to add new date", dtWithTime.toISOString());

    newAutoRunList.push({
      RunTime: dtWithTime.toISOString(),
      Frequency: payFreq,
      AmtPerPaycheck: amtPerPaycheck,
      TotalAmt: totalPurchaseAmt,
    });

    let dtTemp = new Date(dtWithTime);
    switch (payFreq) {
      case "Every Week":
        dtTemp = new Date(dtTemp.setDate(dtTemp.getDate() + 7));
        break;
      case "Every 2 Weeks":
        dtTemp = new Date(dtTemp.setDate(dtTemp.getDate() + 14));
        break;
      case "Monthly":
        dtTemp = new Date(dtTemp.setMonth(dtTemp.getMonth() + 1));
        break;
      default:
        break;
    }

    dtWithTime = dtTemp;
    // console.log("New dtWithTime", dtWithTime.toISOString());
  } while (totalPurchaseAmt > 0);

  let dtPurchaseDate = new Date(
    newAutoRunList[newAutoRunList.length - 1].RunTime
  );
  // console.log("all purchase date", newAutoRunList);
  // console.log("last purchase date", dtPurchaseDate);

  let numPaychecks = newAutoRunList.length;
  let numDaysToPurchase = daysBetween(new Date(), dtPurchaseDate);

  let percentSaved = (ynabLatestBalance / cat.upcomingExpense) * 100;
  if (percentSaved > 100) {
    percentSaved = 100;
  } else if (percentSaved < 0) {
    percentSaved = 0;
  }

  return {
    ItemID: cat.id,
    ItemGroupID: cat.categoryGroupID,
    ItemName: cat.name,
    ItemAmountSaved: ynabLatestBalance,
    ItemAmountTotal: cat.upcomingExpense,
    ItemPercentSaved: percentSaved.toFixed(0) + "%",
    ItemAmount:
      "$" +
      ynabLatestBalance?.toFixed(0) +
      " / $" +
      cat.upcomingExpense?.toFixed(0),
    ItemDate: getShortDate(dtPurchaseDate),
    NumDays: Math.ceil(numDaysToPurchase)?.toFixed(0),
    NumPaychecks: numPaychecks,
  };
}

export function getNextPaydateString(nextPaydate) {
  let dtNext = nextPaydate ? new Date(nextPaydate) : new Date();

  let daysBetweenNext = Math.ceil(daysBetween(new Date(), dtNext));
  if (daysBetweenNext < 0) {
    daysBetweenNext = 0;
  }

  return getShortDate(dtNext) + " (" + daysBetweenNext + " days away)";
}

export function getSetupCategoriesWithMonths(
  sixMonthDetails,
  expandedCategories
) {
  let catsWithMonths = [];
  if (sixMonthDetails) {
    for (let i = 0; i < sixMonthDetails.length; i++) {
      let currCat = sixMonthDetails[i];
      let isExpanded = expandedCategories.includes(currCat.name);

      let catTotalAmt = 0;
      let currAmt = 0;

      let currMonthDivisor = currCat.expenseMonthsDivisor;
      let divisorChanged = false;

      let mthYear = new Date().getFullYear();
      let mthMth = new Date().getMonth();

      let currMonth = new Date(mthYear, mthMth, 1);
      let monthArr = [];
      if (currCat.balance > 0 || currCat.monthsAhead > 0) {
        for (let j = 0; j < currCat.monthsAhead; j++) {
          if (currCat.expenseType == "Monthly") {
            currAmt = currCat.categoryAmount;
          } else {
            if (Math.ceil(catTotalAmt) >= currCat.categoryAmount) {
              currMonthDivisor =
                currCat.repeatFreqNum *
                (currCat.repeatFreqType == "Months" ? 1 : 12);
              divisorChanged = true;
            }
            currAmt = currCat.categoryAmount / currMonthDivisor;
          }

          if (currAmt % 1 > 0) {
            currAmt += 0.01;
          }

          catTotalAmt += currAmt;

          if (!currCat.useCurrentMonth) {
            monthArr.push({
              isParent: false,
              isExpanded: isExpanded,
              id: currCat.id,
              divisorChanged: divisorChanged,
              toggleInclude: currCat.toggleInclude,
              monthNum: j,
              month:
                currMonth.toLocaleString("default", { month: "long" }) +
                " " +
                currMonth.getFullYear(),
              numMonthsAhead: "",
              totalAmount: getMoneyString(currAmt, 2),
            });

            mthMth += 1;
            if (mthMth > 11) {
              mthMth = 0;
              mthYear += 1;
            }

            currMonth = new Date(mthYear, mthMth, 1);
          } else {
            if (monthArr?.length == 0) {
              monthArr.push({
                isParent: false,
                isExpanded: isExpanded,
                id: currCat.id,
                divisorChanged: divisorChanged,
                toggleInclude: currCat.toggleInclude,
                monthNum: j,
                month:
                  currMonth.toLocaleString("default", { month: "long" }) +
                  " " +
                  currMonth.getFullYear(),
                numMonthsAhead: "",
                totalAmount: getMoneyString(catTotalAmt, 2),
              });
            } else {
              monthArr[0].totalAmount = getMoneyString(catTotalAmt, 2);
              monthArr[0].monthNum = j;
            }
          }

          if (divisorChanged) {
            divisorChanged = false;
          }
        }
      }

      catsWithMonths.push({
        isParent: true,
        isExpanded: isExpanded,
        id: currCat.id,
        name: currCat.name,
        numMonthsAhead: currCat.monthsAhead <= 0 ? 0 : currCat.monthsAhead - 1,
        totalAmount: getMoneyString(catTotalAmt),
      });
      catsWithMonths.push(...monthArr);
    }
  }

  console.log("catsWithMonths");
  console.log(catsWithMonths);

  return catsWithMonths;
}

export function getCategoryAmountModified(cat) {
  if (cat.includeOnChart == 0) {
    return 0;
  }

  let newAmt = cat.categoryAmount;

  if (cat.expenseType && cat.expenseType == "By Date") {
    newAmt /= cat.expenseMonthsDivisor;
  }

  newAmt += cat.extraAmount || 0;

  return newAmt;
}

export function getAmountByFrequency(amt, freq) {
  if (freq == "One-Time" || freq == "Monthly") {
    return amt;
  } else if (freq == "Every 2 Weeks") {
    return amt / 2;
  } else if (freq == "Every Week") {
    return amt / 4;
  }
}

var mthDetails = {};
export function setMonthDetails(monthDetails) {
  mthDetails = monthDetails;
}

export function getMonthDetails() {
  return mthDetails;
}

export function getLatestBalance(catID) {
  if (mthDetails && mthDetails.length > 0) {
    let ynabCat = mthDetails[0]?.categories.find((x) => x.id == catID);
    return ynabCat["balance"] == 0 ? 0 : ynabCat["balance"] / 1000;
  }
  return 0;
}

export async function getNewTokens(refreshToken) {
  return await Axios.post("/api/ynab/get_new_tokens", {
    params: {
      refToken: refreshToken,
    },
  });
}
