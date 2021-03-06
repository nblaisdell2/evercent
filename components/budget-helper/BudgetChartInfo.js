import Image from "next/image";
import PencilAltIcon from "@heroicons/react/outline/PencilAltIcon";
import { useState } from "react";
import CollapsibleTable from "../util/CollapsibleTable";
import MyModal from "../util/MyModal";
import data from "../../data.json";

import BudgetCategoryInfo from "./BudgetCategoryInfo";
import MyHelpIcon from "../util/MyHelpIcon";

function BudgetChartInfo(props) {
  const [currModal, setCurrModal] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const setChangesMade = (madeChanges) => {
    // if (madeChanges) {
    let newUserDetails = { ...props.userDetails };
    newUserDetails.UnsavedChanges = madeChanges;
    props.setUserDetails(newUserDetails);
    // }
  };

  const saveCategoryResults = () => {
    console.log("BudgetChartInfo - Saving Category Results");
    let newCategoryList = [...props.userCategoryList];
    if (newCategoryList) {
      console.log("About to set shouldSave");
      console.log(newCategoryList);
      if (newCategoryList.length == 0) {
        // newCategoryList.push({ shouldSave: true });
      } else {
        newCategoryList[0].shouldSave = true;
      }
      console.log("Set shouldSave!");
      console.log(newCategoryList);
      props.setUserCategoryList(newCategoryList);
    }
    // console.log("BudgetChartInfo - Saving Category Results");
    // let newCategoryList = [...props.userCategoryList];
    // if (newCategoryList && newCategoryList.length > 0) {
    //   // console.log("About to set shouldSave");
    //   // console.log(newCategoryList);
    //   newCategoryList[0].shouldSave = true;
    //   // console.log("Set shouldSave!");
    //   // console.log(newCategoryList);
    //   props.setUserCategoryList(newCategoryList);
    // }
  };

  const getNextAutoRunString = (nextRun) => {
    let dtNextRun = new Date(nextRun);
    let dtToday = new Date();

    let strNextRun = dtNextRun
      .toLocaleString()
      .replace(",", " @")
      .replace(":00:00", "");

    let hourDiff =
      Math.floor(Math.abs(dtNextRun - dtToday) / (60 * 60 * 1000)) + 1;
    if (hourDiff < 24) {
      strNextRun +=
        " (" + hourDiff + " " + (hourDiff > 1 ? "hours" : "hour") + ")";
    } else {
      let numDays = Math.floor(hourDiff / 24);
      let numHours = Math.ceil(hourDiff % 24);
      if (numDays >= 2) {
        strNextRun += " (" + numDays + " days)";
      } else {
        strNextRun +=
          " (" +
          numDays +
          " " +
          (numDays > 1 ? "days" : "day") +
          (numDays >= 1 && numHours > 0
            ? " & " + numHours + " " + (numHours > 1 ? "hours" : "hour")
            : "") +
          ")";
      }
    }

    return strNextRun;
  };

  if (Object.keys(props.ynabCategories).length == 0) {
    return (
      <div className="h-full text-center flex flex-col justify-center">
        <div>
          <Image src="/ynab_logo.png" height="200px" width="200px" />
        </div>
        <div className="text-2xl">
          Please Connect to YNAB to get Category Details
        </div>
        <div className="text-lg mt-5">
          {'To connect, use the "Connect to YNAB" button in the top-right!'}
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    console.log("Selected category: ", selectedCategory);
    return (
      <BudgetCategoryInfo
        category={selectedCategory}
        setCategory={setSelectedCategory}
        monthlyAmount={props.userDetails.MonthlyAmount}
        setChangesMade={setChangesMade}
        {...props}
      />
    );
  }

  return (
    <div>
      {/* Title & Save Button */}
      <div className="flex justify-between">
        <div className="flex justify-center items-center">
          <MyHelpIcon
            sizeInPx={35}
            helpModal={data.Modals.HELP_BUDGET_CATEGORIES}
          />
          <h1 className="font-bold text-2xl underline">Budget Categories</h1>
        </div>

        {props.userDetails.UnsavedChanges && (
          <div
            className="flex hover:underline"
            onClick={() => {
              saveCategoryResults();
              setChangesMade(false);
            }}
          >
            <PencilAltIcon className="h-6 cursor-pointer" />
            <h2 className="cursor-pointer">Save Changes</h2>
          </div>
        )}
      </div>

      {/* Category Table */}
      <CollapsibleTable
        colNames={["Category", "Options", "Amount", "% of Income"]}
        data={{
          userCategoryList: props.userCategoryList,
          monthlyAmount: props.userDetails.MonthlyAmount,
          setUserCategoryList: props.setUserCategoryList,
          frequency: props.userDetails.PayFrequency,
          setSelectedCategory: setSelectedCategory,
        }}
        listName={"BudgetCategoryList"}
      />

      <hr />

      {/* Automate & Add/Remove Categories */}
      <div className="flex flex-row justify-between mt-3 items-center">
        <h2
          className="hover:underline cursor-pointer"
          onClick={() => setCurrModal(data.Modals.AUTOMATION)}
        >
          {props.userDetails.UserID &&
            (props.userDetails.NextAutomatedRun == null ? (
              <div>Automate?</div>
            ) : (
              <div>
                <div>Next Auto Run At</div>
                <div>
                  {getNextAutoRunString(props.userDetails.NextAutomatedRun)}
                </div>
              </div>
            ))}
        </h2>
        <h2
          className="hover:underline cursor-pointer"
          onClick={() => setCurrModal(data.Modals.YNAB_CATEGORIES)}
        >
          Add/Remove YNAB Categories
        </h2>
      </div>

      <MyModal
        currModal={currModal}
        setCurrModal={setCurrModal}
        setChangesMade={setChangesMade}
        {...props}
      />
    </div>
  );
}

export default BudgetChartInfo;
