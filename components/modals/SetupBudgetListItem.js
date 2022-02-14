import ChevronDownIcon from "@heroicons/react/outline/ChevronDownIcon";
import ChevronRightIcon from "@heroicons/react/outline/ChevronRightIcon";

function SetupBudgetListItem({
  isParent,
  isExpanded,
  category,
  toggleCategory,
  addMonthToCategory,
  removeMonthFromCategory,
}) {
  let currMonth =
    new Date().toLocaleString("default", { month: "long" }) +
    " " +
    new Date().getFullYear();

  return (
    (isParent && (
      <tr className="cursor-pointer hover:bg-gray-200">
        <td>
          {isExpanded ? (
            <ChevronDownIcon className="h-6 inline" />
          ) : (
            <ChevronRightIcon className="h-6 inline" />
          )}
        </td>
        <td
          onClick={() => {
            toggleCategory(category.name, isExpanded);
          }}
        >
          <span className="cursor-pointer font-bold">{category.name}</span>
        </td>
        <td>
          <div className="text-2xl flex justify-evenly">
            <div
              onClick={() => {
                removeMonthFromCategory(category.id);
              }}
              className={`${
                parseInt(category.numMonthsAhead) <= 0 &&
                parseInt(category.totalAmount.replace("$", "")) == 0
                  ? ""
                  : "hover:bg-red-700"
              } text-white font-bold text-center h-full w-full mx-1 rounded-md select-none ${
                parseInt(category.numMonthsAhead) <= 0 &&
                parseInt(category.totalAmount.replace("$", "")) == 0
                  ? "bg-gray-400"
                  : "bg-red-500"
              }`}
            >
              -
            </div>
            <div
              onClick={() => {
                addMonthToCategory(category.id);
              }}
              className=" bg-green-500 hover:bg-green-600 text-white font-bold text-center h-full w-full mx-1 rounded-md select-none"
              type="button"
            >
              +
            </div>
          </div>
        </td>
        <td
          onClick={() => {
            toggleCategory(category.name, isExpanded);
          }}
        >
          <div
            className={`text-center font-bold ${
              parseInt(category.numMonthsAhead) <= 0 ? "text-gray-400" : ""
            }`}
          >
            {category.numMonthsAhead}{" "}
            {category.numMonthsAhead == 0 &&
              parseInt(category.totalAmount.replace("$", "")) > 0 && (
                <span className=" font-extrabold text-red-500">*</span>
              )}
          </div>
        </td>
        <td
          onClick={() => {
            toggleCategory(category.name, isExpanded);
          }}
        >
          <div className="text-center font-bold">{category.totalAmount}</div>
        </td>
      </tr>
    )) ||
    (isExpanded && (
      <tr className="cursor-pointer hover:bg-gray-300">
        <td></td>
        <td>
          <span className="ml-3">
            {category.month == currMonth && (
              <span className=" font-extrabold text-red-500">*</span>
            )}{" "}
            {category.month}
          </span>
        </td>
        <td>
          <span className="ml-3"></span>
        </td>
        <td>
          <span className="ml-3"></span>
        </td>
        <td className="text-center">
          <span>{category.totalAmount}</span>
        </td>
      </tr>
    )) ||
    null
  );
}

export default SetupBudgetListItem;
