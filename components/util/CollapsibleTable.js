import React from "react";
import { getCategoryAmountModified, getMoneyString } from "../../utils";
import { getCategoryListItems } from "../../evercent";
import BudgetCategoryInfoListItem from "../budget-helper/BudgetCategoryInfoListItem";

// function getNewListItem(key, id, isParent, isExpanded, props) {
//   return {
//     key: key,
//     id: id,
//     isParent: isParent,
//     isExpanded: isExpanded,
//     ...props,
//   };
// }

function CollapsibleTable({ colNames, data, listName }) {
  // const getCategoryListItems = (userCategoryList, monthlyAmount) => {
  //   let listItems = [];
  //   let newItem = {};
  //   for (let i = 0; i < userCategoryList.length; i++) {
  //     let currItem = userCategoryList[i];
  //     let groupTotalModified = currItem.categories.reduce((a, b) => {
  //       return a + getCategoryAmountModified(b);
  //     }, 0);

  //     newItem = getNewListItem(
  //       currItem.id,
  //       currItem.id,
  //       true,
  //       currItem.isExpanded,
  //       {
  //         category: currItem.name,
  //         amount: getMoneyString(groupTotalModified),
  //         amountNum: groupTotalModified,
  //         percentIncome:
  //           (monthlyAmount == 0
  //             ? 0
  //             : Math.round((groupTotalModified / monthlyAmount) * 100)) + "%",
  //         isRegular: null,
  //         isUpcoming: null,
  //         fullCategory: null,
  //       }
  //     );
  //     listItems.push(newItem);

  //     for (let j = 0; j < currItem.categories.length; j++) {
  //       let currCat = currItem.categories[j];
  //       let catAmtMod = getCategoryAmountModified(currCat);
  //       let showOther = currCat.categoryAmount !== catAmtMod;

  //       newItem = getNewListItem(
  //         currCat.id,
  //         currCat.id,
  //         false,
  //         currItem.isExpanded,
  //         {
  //           category: currCat.name,
  //           amount: !showOther
  //             ? getMoneyString(catAmtMod, 2)
  //             : getMoneyString(catAmtMod, 2) +
  //               " / (" +
  //               getMoneyString(currCat.categoryAmount) +
  //               ")",
  //           amountNum: showOther ? catAmtMod : currCat.categoryAmount,
  //           percentIncome:
  //             (monthlyAmount == 0
  //               ? 0
  //               : (catAmtMod / monthlyAmount) * 100
  //             ).toFixed(2) + "%",
  //           isRegular: currCat.expenseType !== null,
  //           isUpcoming: currCat.upcomingExpense !== null,
  //           fullCategory: currCat,
  //         }
  //       );
  //       listItems.push(newItem);
  //     }
  //   }
  //   return listItems;
  // };

  const getListItems = (listName, data) => {
    switch (listName) {
      case "BudgetCategoryList":
        return getCategoryListItems(data.userCategoryList, data.monthlyAmount);
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
  //   console.log("What are the list items?");
  //   console.log(listItems);

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
