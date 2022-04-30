import { Chart } from "react-google-charts";
import MyHelpIcon from "../util/MyHelpIcon";
import data from "../../data.json";

function SixMonthChart(props) {
  const options = {
    title: "",
    fontSize: 14,
    bold: true,
    legend: "none",
    bar: { groupWidth: "80%" },
    chartArea: { width: "80%", height: "95%" },
    axes: {
      x: {
        0: { side: "top", label: "White to move" }, // Top x-axis.
      },
    },
    backgroundColor: { fill: "transparent" },
    seriesType: "bars",
    series: {
      1: {
        type: "line",
        lineDashStyle: [8, 6],
      },
    },
    vAxis: {
      textStyle: {
        bold: true,
      },
    },
    hAxis: {
      viewWindow: {
        min: 0,
        max:
          props.sixMonthDetails.monthsAheadTarget > 12
            ? props.sixMonthDetails.monthsAheadTarget * 1.25
            : 12,
      },
    },
  };

  const chartData = () => {
    let data = [["BillName", "Months Ahead", { role: "style" }, "Target"]];
    data.push(["", 0, "", props.sixMonthDetails.monthsAheadTarget]);

    for (let i = 0; i < props.sixMonthDetails.categories.length; i++) {
      let currCat = props.sixMonthDetails.categories[i];

      let barColor = "red";
      let percentMet =
        currCat.monthsAhead / props.sixMonthDetails.monthsAheadTarget;
      if (percentMet >= 0.3 && percentMet < 1) {
        barColor = "gold";
      } else if (percentMet >= 1) {
        barColor = "green";
      }

      if (currCat.monthsAhead <= 0) {
        barColor = "";
      }

      data.push([
        currCat.name,
        currCat.monthsAhead < 0 ? 0 : currCat.monthsAhead,
        barColor,
        props.sixMonthDetails.monthsAheadTarget,
      ]);
    }

    data.push(["", 0, "", props.sixMonthDetails.monthsAheadTarget]);

    return data;
  };

  return (
    <>
      <div className="flex justify-center items-center">
        <MyHelpIcon sizeInPx={35} helpModal={data.Modals.HELP_REG_EXPENSES} />
        <div className="text-center font-bold text-2xl">
          Regular Expenses Progress
        </div>
      </div>

      <div className="h-[550px] overflow-y-auto mt-10">
        {props.sixMonthDetails.categories.length == 0 ? (
          <div>
            <div className="text-center">
              {
                'Mark some Categories as a "Regular Expense" to track your progress on each of those categories.'
              }
            </div>
          </div>
        ) : (
          <Chart
            chartType="BarChart"
            data={chartData()}
            options={options}
            width="100%"
            height="1000px"
            legendToggle
          />
        )}
      </div>
    </>
  );
}

export default SixMonthChart;
