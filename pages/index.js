import { useEffect, useState } from "react";
import { useUser, getSession } from "@auth0/nextjs-auth0";
import Router from "next/router";
import Cookies from "universal-cookie";

import {
  getPreloadedData,
  getOrderedCategoryList,
  setYnabSixMonthDetails,
  getUpcomingDetails,
  setMonthDetails,
} from "../evercent";
import { postAPIDataClient } from "../utils";
import data from "../data.json";

import Header from "../components/layout/Header";
import Main from "../components/Main";

// ****************
// Cookie Functions
// ****************
function SetCookie(cookies, key, val) {
  try {
    // console.log("Setting cookie: '" + key + "' = " + val);
    cookies.set(key, val);
    // console.log(cookies.cookies);
  } catch (err) {
    console.log("ERROR: Setting cookie: '" + key + "' = " + val);
    console.log(err);
  }
}

function ClearCookies(cookies) {
  let allCookies = cookies.getAll();
  for (const c in allCookies) {
    cookies.remove(c);
  }
}

export async function getServerSideProps(ctx) {
  // Get access to the Auth0 user object during pre-render stage
  const auth0User = getSession(ctx.req, ctx.res);
  const myUser = auth0User?.user?.email;

  // Then, check to see if the URL contains the "code" query parameter.
  //   If it does, that means we just returned from connecting to YNAB for
  //   the first time. In that case, we should get an Access/Refresh token
  //   from the YNAB API, and store the results in the database if the user is logged in
  const ynabAuthCode = ctx?.query?.code;

  // Get access to the Cookies. This will contain the values we would normally
  // have stored in sessionStorage, since we can't access session storage
  // from within getServerSideProps.
  const myCookies = new Cookies(ctx.req.cookies);

  return await getPreloadedData(myUser, ynabAuthCode, myCookies);
}

const cookies = new Cookies();

export default function Home({
  preUserDetails,
  preAutoRuns,
  preUserCategories,
  preSixMonthDetails,
  preUpcomingDetails,
  preYNABMonthDetails,
  preYNABCategories,
  preConnectTokens,
  reload,
}) {
  const { user, isLoading } = useUser();

  const [firstLoad, setFirstLoad] = useState(true);

  const [userDetails, setUserDetails] = useState(preUserDetails);
  const [nextAutoRuns, setNextAutoRuns] = useState(preAutoRuns);
  const [ynabCategories, setYnabCategories] = useState(preYNABCategories);
  const [userCategoryList, setUserCategoryList] = useState(preUserCategories);
  const [sixMonthDetails, setSixMonthDetails] = useState(preSixMonthDetails);
  const [upcomingDetails, setUpcomingDetails] = useState(preUpcomingDetails);

  const resetCategoryDetails = async (savedList) => {
    if (savedList) {
      savedList = JSON.parse(savedList);
      savedList = await getOrderedCategoryList(savedList, ynabCategories);

      console.log("New saved list:", savedList);

      setUserCategoryList(savedList);

      let newYNABList = [...ynabCategories];
      console.log("newYNABList", newYNABList);

      for (let i = 0; i < savedList.length; i++) {
        let currSavedGroup = savedList[i];
        console.log("currSavedGroup", currSavedGroup);

        newYNABList
          .find((x) => x.id == currSavedGroup.id)
          .categories.map((x) => {
            x.inUserList =
              currSavedGroup.categories.filter((c) => c.id == x.id).length > 0;
            return x;
          });
        setYnabCategories(newYNABList);
      }
    }
  };

  useEffect(async () => {
    console.log("useEffect - isLoading");

    if (reload) {
      // I need a way to save the tokens from YNAB to session storage in here,
      // after the user has tried to connect to YNAB for the first time, so that
      // on the next time after the page reloads, we'll be able to pull the access tokens
      // from session storage below this "if" statement. This is because the "sessionStorage"
      // is client-side only, and we don't have access to it during pre-rendering (getServerSideProps)
      let keys = Object.keys(preConnectTokens);
      for (let i = 0; i < keys.length; i++) {
        if (keys[i] && preConnectTokens[keys[i]]) {
          SetCookie(cookies, keys[i], preConnectTokens[keys[i]]);
        }
      }

      Router.push("/");
    }

    if (!isLoading) {
      setMonthDetails(preYNABMonthDetails);

      let savedList = sessionStorage.getItem(data.MyCookies.USER_CATEGORY_LIST);

      if (!user) {
        // Load any user detail properties into the Cookies, in case they choose to
        // create a login after changing some values. That way, we can pre-load that
        // data into the database when adding a new user
        let keys = Object.keys(userDetails);
        if (keys) {
          for (let i = 0; i < keys.length; i++) {
            SetCookie(cookies, keys[i], userDetails[keys[i]]);
          }
        }

        // If there was already a Cookie for the YNAB Access token, and now we have a new
        // access token, that means that the token had expired, and we need to reload
        // the cookie values based on the newly refreshed tokens and expiration date
        let allCookies = cookies.getAll();
        if (
          preUserDetails.AccessToken &&
          allCookies.AccessToken &&
          preUserDetails.AccessToken !== allCookies.AccessToken
        ) {
          for (const c in allCookies) {
            SetCookie(cookies, c, preUserDetails[c]);
          }
        }

        resetCategoryDetails(savedList);
      } else {
        if (userCategoryList && userCategoryList.length == 0 && savedList) {
          // If we log in, and there were categories in session storage, but the user didn't have ANY categories
          // previously saved in the database, then we can assume that the user is logging in for the first time,
          // and we want to save their session results into the database. I'd like to do this in pre-rendering, but
          // since I don't have access to session storage at that stage, and the user list won't fit in Cookies,
          // we'll have to take one extra step to load any previously entered category details into the database here.
          console.log("Had previously entered data! Saving in database");
          postAPIDataClient(data.Queries.UPDATE_CATEGORY_LIST, {
            UserID: userDetails.UserID,
            BudgetID: userDetails.DefaultBudgetID,
            Details: savedList,
          });

          resetCategoryDetails(savedList);
        }

        // If the user is logged in, clear any Cookies that there may have been.
        // That way, when they log out, any results that were used before logging in
        // will be discarded.
        ClearCookies(cookies);
        sessionStorage.clear();
      }
    }
  }, [isLoading]);

  useEffect(async () => {
    if (firstLoad) {
      setFirstLoad(false);
      return;
    }

    console.log("useEffect - userDetails");
    console.log(userDetails);

    if (user) {
      postAPIDataClient(data.Queries.UPDATE_USER_DETAILS, {
        UserID: userDetails.UserID,
        BudgetID: userDetails.DefaultBudgetID,
        MonthlyAmount: userDetails.MonthlyAmount,
        MonthsAheadTarget: userDetails.MonthsAheadTarget,
        PayFrequency: userDetails.PayFrequency,
        NextPaydate: userDetails.NextPaydate,
      });

      postAPIDataClient(data.Queries.UPDATE_YNAB_TOKENS, {
        UserID: userDetails.UserID,
        AccessToken: userDetails.AccessToken,
        ExpirationDate: userDetails.ExpirationDate,
        RefreshToken: userDetails.RefreshToken,
      });
    } else {
      let keys = Object.keys(data.MyCookies);
      for (let i = 0; i < keys.length; i++) {
        let cookieKey = data.MyCookies[keys[i]];
        if (userDetails[cookieKey]) {
          SetCookie(cookies, cookieKey, userDetails[cookieKey]);
        }
      }
    }
  }, [userDetails]);

  useEffect(async () => {
    console.log("useEffect - userCategoryList");
    console.log(userCategoryList);
    // console.log(userCategoryList[0]);
    // console.log(userCategoryList[0]?.shouldSave);

    let newSixMoDt = await setYnabSixMonthDetails(
      userCategoryList,
      userDetails.MonthsAheadTarget
    );
    setSixMonthDetails(newSixMoDt);

    let newUpcomingDetails = await getUpcomingDetails(
      userCategoryList,
      userDetails.PayFrequency,
      userDetails.NextPaydate
    );
    setUpcomingDetails(newUpcomingDetails);

    if (userCategoryList && userCategoryList[0]?.shouldSave) {
      let newUserList = [...userCategoryList];
      // console.log("useEffect - userCategoryList - before deleting shouldSave");
      // console.log(newUserList);
      delete newUserList[0]?.shouldSave;
      // console.log("useEffect - userCategoryList - after deleting shouldSave");
      // console.log(newUserList);

      if (user) {
        await postAPIDataClient(data.Queries.UPDATE_CATEGORY_LIST, {
          UserID: userDetails.UserID,
          BudgetID: userDetails.DefaultBudgetID,
          Details: JSON.stringify(newUserList),
        });
      } else {
        sessionStorage.setItem(
          data.MyCookies.USER_CATEGORY_LIST,
          JSON.stringify(newUserList)
        );
      }
    }
  }, [userCategoryList]);

  useEffect(async () => {
    console.log("useEffect - sixMonthDetails");

    if (sixMonthDetails && sixMonthDetails?.shouldSave) {
      let newSixMoDt = { ...sixMonthDetails };
      delete newSixMoDt.shouldSave;

      setSixMonthDetails(newSixMoDt);

      let newUserDetails = { ...userDetails };
      newUserDetails.MonthsAheadTarget = newSixMoDt.monthsAheadTarget;
      setUserDetails(newUserDetails);
    }
  }, [sixMonthDetails]);

  useEffect(async () => {
    console.log("useEffect - NextAutoRuns");

    let newRunList = [...nextAutoRuns];

    if (user && newRunList && newRunList[0]?.shouldSave) {
      delete newRunList[0].shouldSave;

      if (newRunList.length == 1 && Object.keys(newRunList[0]).length == 0) {
        // We need to delete the automation runs
        await postAPIDataClient(data.Queries.DELETE_AUTO_RUN_LIST, {
          UserID: userDetails.UserID,
          BudgetID: userDetails.DefaultBudgetID,
        });
      } else {
        // We need to ADD the automation runs
        await postAPIDataClient(data.Queries.UPDATE_AUTO_RUN_LIST, {
          UserID: userDetails.UserID,
          BudgetID: userDetails.DefaultBudgetID,
          NextRunList: JSON.stringify(newRunList),
        });
      }

      Router.reload(window.location.pathname);
    }
  }, [nextAutoRuns]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  console.log("UserDetails:        ", userDetails);
  console.log("User Category List: ", userCategoryList);
  console.log("Six Month Details:  ", sixMonthDetails);
  console.log("Upcoming Details:   ", upcomingDetails);
  console.log("Next Auto Runs:     ", nextAutoRuns);
  console.log("YNAB Category List: ", ynabCategories);

  return (
    <div>
      <style jsx global>{`
        body {
          background-color: #d1f5ff;
        }
      `}</style>
      <Header
        isConnectedToYNAB={
          userDetails.AccessToken !== null &&
          userDetails.AccessToken !== undefined
        }
      />
      <Main
        userDetails={userDetails}
        setUserDetails={setUserDetails}
        userCategoryList={userCategoryList}
        setUserCategoryList={setUserCategoryList}
        sixMonthDetails={sixMonthDetails}
        setSixMonthDetails={setSixMonthDetails}
        upcomingDetails={upcomingDetails}
        setUpcomingDetails={setUpcomingDetails}
        nextAutoRuns={nextAutoRuns}
        setNextAutoRuns={setNextAutoRuns}
        ynabCategories={ynabCategories}
        setYnabCategories={setYnabCategories}
      />
    </div>
  );
}
