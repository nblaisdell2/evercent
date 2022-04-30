import React, { useEffect, useState } from "react";
import { getNewListItem } from "../../evercent";
import { treatAsUTC, getMoneyString } from "../../utils";

function AutomationPastRunsModal(props) {
  const [selectedPastRun, setSelectedPastRun] = useState(null);
  const [selectedCatMonthList, setSelectedCatMonthList] = useState([]);
  //   const [selectedCatIDs, setSelectedCatIDs] = useState([]);

  let myTempAutoRuns = [];

  let lastRunTime = null;
  let currRunTime = null;
  let currRun = {};
  for (let i = 0; i < props.pastAutoRuns.length; i++) {
    currRunTime = treatAsUTC(props.pastAutoRuns[i].RunTime);

    lastRunTime?.setHours(lastRunTime?.getHours(), 0, 0, 0);
    currRunTime.setHours(currRunTime.getHours(), 0, 0, 0);

    console.log("comparing");
    console.log(lastRunTime?.toISOString());
    console.log(currRunTime.toISOString());

    if (
      lastRunTime == null ||
      lastRunTime.toISOString() !== currRunTime.toISOString()
    ) {
      console.log("Found difference!");

      lastRunTime = treatAsUTC(props.pastAutoRuns[i].RunTime);

      if (Object.keys(currRun).length > 0) {
        myTempAutoRuns.push(currRun);
      }

      currRun = {
        RunTime: lastRunTime.toISOString(),
        RunTotal: 0,
        categories: [],
      };
    }

    currRun.RunTotal += props.pastAutoRuns[i].AmountPosted;

    let dtPostMonth = new Date(props.pastAutoRuns[i].PostingMonth);
    currRun.categories.push({
      id: props.pastAutoRuns[i].CategoryID,
      PostMonth:
        dtPostMonth
          .toLocaleString("default", { month: "long" })
          .substring(0, 3)
          .toUpperCase() +
        " " +
        dtPostMonth.getFullYear(),
      OldAmount: props.pastAutoRuns[i].OldAmountBudgeted,
      PostAmount: props.pastAutoRuns[i].AmountPosted,
      NewAmount: props.pastAutoRuns[i].NewAmountBudgeted,
    });
  }
  myTempAutoRuns.push(currRun);

  console.log("myPastAutoRuns", props.pastAutoRuns);
  console.log("myTempAutoRuns", myTempAutoRuns);

  useEffect(() => {
    if (selectedPastRun) {
      // Go through each of the userCategoryList categories (parent & children) to make sure
      // that we are adding them to this new list in the proper order.

      // Then, if we find a category that is within the current group of our userCategoryList,
      // we should use append the group item, if it hasn't been added already, and then
      // add the category item (match format from getCategoryieswithMonths).

      // Then, for this category, go through the original values in newCatMonthList,
      // which will be an array of months & amounts. Add these values as another row
      // to the NEW newCatMonthList.

      let listItems = [];
      let newItem = {};
      let allCats = props.ynabCategories;
      console.log("allCats", allCats);

      for (let i = 0; i < allCats.length; i++) {
        let ynabGroupName = allCats[i].name;
        let ynabGroupID = allCats[i].id;
        let groupTotal = 0;
        let addedGroup = false;

        for (let j = 0; j < allCats[i].categories.length; j++) {
          let ynabCatID = allCats[i].categories[j].id;
          let ynabCatName = allCats[i].categories[j].name;

          let addedCategory = false;

          let catPastPosts = selectedPastRun.categories.filter(
            (x) => x.id == ynabCatID
          );

          let catTotal = catPastPosts?.reduce((prev, curr) => {
            return prev + curr.PostAmount;
          }, 0);
          groupTotal += catTotal;

          for (let k = 0; k < catPastPosts.length; k++) {
            if (!addedGroup) {
              newItem = getNewListItem(ynabGroupID, ynabGroupID, true, true, {
                category: ynabGroupName,
                amountNum: 12,
              });
              listItems.push(newItem);

              addedGroup = true;
            }

            if (!addedCategory) {
              newItem = getNewListItem(ynabCatID, ynabCatID, false, true, {
                category: ynabCatName,
                amountNum: catTotal,
              });
              listItems.push(newItem);

              addedCategory = true;
            }

            newItem = getNewListItem(
              catPastPosts[k].id + i.toString(),
              catPastPosts[k].id,
              false,
              false,
              {
                month: catPastPosts[k].PostMonth,
                amountNum: catPastPosts[k].PostAmount,
              }
            );
            listItems.push(newItem);
          }
        }

        let groupItem = listItems.find((x) => x.category == ynabGroupName);
        if (groupItem) {
          groupItem.amountNum = groupTotal;
        }
      }

      setSelectedCatMonthList(listItems);
      //   setSelectedCatIDs([]);
    }
  }, [selectedPastRun]);

  //   const toggleShowAmountsPerCategory = (category) => {
  //     let newCatIDs = [...selectedCatIDs];
  //     if (newCatIDs.includes(category.id)) {
  //       newCatIDs = newCatIDs.filter((x) => x !== category.id);
  //     } else {
  //       newCatIDs.push(category.id);
  //     }
  //     setSelectedCatIDs(newCatIDs);
  //   };

  return (
    <div className="h-[600px] flex flex-col mt-1 m-5 relative">
      {/* Header */}
      <div className="text-center text-3xl font-bold">Automation Past Runs</div>

      {/* Past Auto Runs List */}
      <div className="flex flex-col mt-5">
        <div className="h-[120px] w-full overflow-y-auto flex flex-col items-center border-2 border-black rounded-md">
          {/* {props.pastAutoRuns?.map((v, i) => { */}
          {myTempAutoRuns?.map((v, i) => {
            console.log("selectedPastRun", selectedPastRun);
            console.log("v", v);
            return (
              <div
                key={i}
                className={`flex w-full justify-between hover:bg-gray-200 hover:cursor-pointer ${
                  selectedPastRun?.RunTime == v.RunTime ? "bg-gray-300" : ""
                }`}
                onClick={() => {
                  setSelectedPastRun(v);
                }}
              >
                <div
                  className={`text-lg ml-2 ${
                    selectedPastRun?.RunTime == v.RunTime ? "font-bold" : ""
                  }`}
                >
                  {new Date(v.RunTime).toLocaleString().replace(",", " @")}
                </div>
                <div
                  className={`text-lg mr-2 ${
                    selectedPastRun?.RunTime == v.RunTime ? "font-bold" : ""
                  }`}
                >
                  {getMoneyString(v.RunTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPastRun && (
        <div className="my-3">
          <div className="h-[430px] overflow-y-auto border-2 border-black rounded-md p-2">
            <div className="flex justify-between border-b-2 border-black">
              <div className="font-bold text-xl">Total</div>
              <div className="font-bold text-2xl text-green-500">
                {getMoneyString(selectedPastRun.RunTotal)}
              </div>
            </div>
            {/* month / id / isParent /  */}
            {selectedCatMonthList.map((v, i) => {
              console.log("selected category list item", v);
              //   if (v.month && !selectedCatIDs.includes(v.id)) {
              //     return <></>;
              //   }
              return (
                <div
                  key={v.id + i.toString()}
                  className={`flex justify-between ${
                    v.isParent ? "" : " hover:bg-gray-300 hover:cursor-pointer"
                  }`}
                  // onClick={() => toggleShowAmountsPerCategory(v)}
                >
                  {!v.month ? (
                    <>
                      <div className={`${v.isParent ? "font-bold" : "ml-5"}`}>
                        {v.category}
                      </div>
                      <div className={`${v.isParent ? "font-bold" : ""}`}>
                        {getMoneyString(v.amountNum, 2)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="ml-10 italic text-gray-400">
                        {v.month}
                      </div>
                      <div className="italic text-xs flex items-center">
                        {getMoneyString(v.amountNum, 2)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomationPastRunsModal;
