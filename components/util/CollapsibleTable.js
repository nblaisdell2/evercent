import React from "react";
import { getCategoryListItems } from "../../evercent";
import BudgetCategoryInfoListItem from "../budget-helper/BudgetCategoryInfoListItem";

function CollapsibleTable({ colNames, data, listName }) {
  const getListItems = (listName, data) => {
    switch (listName) {
      case "BudgetCategoryList":
        return getCategoryListItems(
          data.userCategoryList,
          data.monthlyAmount,
          data.frequency
        );
      default:
        break;
    }
  };

  const getListComponent = (listName, item) => {
    switch (listName) {
      case "BudgetCategoryList":
        return (
          <BudgetCategoryInfoListItem
            key={item.key}
            id={item.id}
            isParent={item.isParent}
            isExpanded={item.isExpanded}
            category={item.category}
            amount={item.amount}
            percentIncome={item.percentIncome}
            isRegular={item.isRegular}
            isUpcoming={item.isUpcoming}
            fullCategory={item.fullCategory}
            {...data}
          />
        );
      default:
        break;
    }
  };

  let listItems = getListItems(listName, data);
  console.log("What are the list items?");
  console.log(listItems);

  return (
    <div className="flex flex-col my-2 h-[580px] overflow-y-auto">
      <table className="relative table-auto">
        <thead>
          <tr>
            <th className="sticky top-0 bg-white p-2 text-xl"></th>
            {colNames.map((item, i) => {
              return (
                <th key={i} className="sticky top-0 bg-white p-2 text-xl">
                  {item}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {listItems.map((item, i) => {
            // console.log("Single item:");
            // console.log(item);
            return getListComponent(listName, item);
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CollapsibleTable;
