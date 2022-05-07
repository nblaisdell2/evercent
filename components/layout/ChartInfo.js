import BudgetChartInfo from "../budget-helper/BudgetChartInfo";
import SixMonthInfo from "../six-month/SixMonthInfo";
import UpcomingExpensesInfo from "../upcoming/UpcomingExpensesInfo";

function ChartInfo(props) {
  const renderChartInfo = (name) => {
    switch (name) {
      case "Budget Chart":
        return <BudgetChartInfo {...props} />;
      case "Regular Expenses":
        return <SixMonthInfo {...props} />;
      case "Upcoming Expenses":
        return <UpcomingExpensesInfo {...props} />;
      default:
        return <div>No Data</div>;
    }
  };

  return (
    <div className="w-2/5 border-2 border-gray-400 p-5 rounded-3xl ml-3 mr-6 shadow-2xl h-[720px] bg-white">
      {renderChartInfo(props.name)}
    </div>
  );
}

export default ChartInfo;
