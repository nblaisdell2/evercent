import CalendarIcon from "@heroicons/react/solid/CalendarIcon";
import GiftIcon from "@heroicons/react/solid/GiftIcon";
import ChartBarIcon from "@heroicons/react/solid/ChartBarIcon";

function Widgets({ name, setWidget }) {
  const widgetItem = (name, selected) => {
    let myIcon = null;
    switch (name) {
      case "Budget Chart":
        myIcon = <ChartBarIcon height={30} width={30} />;
        break;
      case "Regular Expenses":
        myIcon = <CalendarIcon height={30} width={30} />;
        break;
      case "Upcoming Expenses":
        myIcon = <GiftIcon height={30} width={30} />;
        break;
    }
    return (
      <button
        onClick={() => setWidget(name)}
        className={`font-bold p-3 rounded-md hover:underline ${
          selected
            ? "bg-blue-400 text-white"
            : "hover:bg-blue-300 hover:text-white"
        }`}
      >
        <div className="text-center">
          <div className="flex justify-center">{myIcon}</div>
          <div>{name}</div>
        </div>
      </button>
    );
  };
  return (
    <div className="flex justify-center space-x-20 text-2xl my-5">
      {widgetItem("Budget Chart", name === "Budget Chart")}
      {widgetItem("Regular Expenses", name === "Regular Expenses")}
      {widgetItem("Upcoming Expenses", name === "Upcoming Expenses")}
    </div>
  );
}

export default Widgets;
