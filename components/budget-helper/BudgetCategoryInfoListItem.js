import ChevronDownIcon from "@heroicons/react/outline/ChevronDownIcon";
import ChevronRightIcon from "@heroicons/react/outline/ChevronRightIcon";
import CalendarIcon from "@heroicons/react/solid/CalendarIcon";
import GiftIcon from "@heroicons/react/solid/GiftIcon";

function BudgetCategoryInfoListItem({
  id,
  category,
  amount,
  percentIncome,
  isParent,
  isExpanded,
  isRegular,
  isUpcoming,
  fullCategory,
  setSelectedCategory,
  userCategoryList,
  setUserCategoryList,
}) {
  return (
    (isParent && (
      <tr
        className="cursor-pointer hover:bg-gray-200"
        onClick={() => {
          let newList = [...userCategoryList];
          let expandGroup = newList.find((x) => x.id == id);
          expandGroup.isExpanded = !isExpanded;
          setUserCategoryList(newList);
        }}
      >
        <td>
          {isExpanded ? (
            <ChevronDownIcon className="h-6 inline" />
          ) : (
            <ChevronRightIcon className="h-6 inline" />
          )}
        </td>
        <td>
          <span className="cursor-pointer font-bold">{category}</span>
        </td>
        <td>
          <div>{isRegular}</div>
          <div>{isUpcoming}</div>
        </td>
        <td className="text-right font-bold">
          <span className="mr-1">{amount}</span>
        </td>
        <td className="text-right font-bold">
          <span className="mr-10">{percentIncome}</span>
        </td>
      </tr>
    )) ||
    (isExpanded && (
      <tr
        className="cursor-pointer hover:bg-gray-300"
        onClick={() => {
          setSelectedCategory(fullCategory);
        }}
      >
        <td></td>
        <td>
          <span className="ml-4 cursor-pointer">{category}</span>
        </td>
        <td>
          <div className="flex justify-center items-center">
            <div className="h-[20px] w-[20px] mr-1">
              {isRegular && (
                <CalendarIcon height={20} width={20} color={"#097fd9"} />
              )}
            </div>
            <div className="h-[20px] w-[20px] ml-1">
              {isUpcoming && (
                <GiftIcon height={20} width={20} color={"#c857f5"} />
              )}
            </div>
          </div>
        </td>
        <td className="text-right">
          <span className="mr-1">{amount}</span>
        </td>
        <td className="text-right">
          <span className="mr-10">{percentIncome}</span>
        </td>
      </tr>
    )) ||
    null
  );
}

export default BudgetCategoryInfoListItem;
