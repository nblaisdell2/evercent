import BudgetChart from "../budget-helper/BudgetChart";
import SixMonthChart from "../six-month/SixMonthChart";
import UpcomingExpensesChart from "../upcoming/UpcomingExpensesChart";

function ChartSection(props) {
  const renderChartDetails = (name) => {
    switch (name) {
      case "Budget Chart":
        return <BudgetChart {...props} />;
      case "Regular Expenses":
        return <SixMonthChart {...props} />;
      case "Upcoming Expenses":
        return <UpcomingExpensesChart {...props} />;
      default:
        return <div>No Data</div>;
    }
  };

  return (
    <div className="w-3/5 border-2 border-gray-400 p-5 rounded-3xl ml-6 mr-3 shadow-2xl h-[720px] bg-white">
      {renderChartDetails(props.name)}
    </div>
  );
}

export default ChartSection;
