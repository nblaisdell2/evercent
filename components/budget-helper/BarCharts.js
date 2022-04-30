import React, { useState } from "react";
import { Chart } from "react-google-charts";
import { getCategoryAmountModified } from "../../evercent";
import MyHelpIcon from "../util/MyHelpIcon";
import data from "../../data.json";

function BarCharts(props) {
  const [currSelectedColumn, setCurrSelectedColumn] = useState(null);

  const chartEvents = [
    {
      eventName: "select",
      callback: ({ chartWrapper }) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length === 1) {
          const [selectedItem] = selection;
          const dataTable = chartWrapper.getDataTable();
          const { row, column } = selectedItem;

          const colName = dataTable?.getColumnLabel(column);

          let newList = [...props.userCategoryList];
          for (let i = 0; i < newList.length; i++) {
            if (currSelectedColumn !== null && currSelectedColumn == colName) {
              newList[i].isSelected = false;
              setCurrSelectedColumn(null);
            } else {
              if (newList[i].name == colName) {
                newList[i].isSelected = true;
              } else {
                newList[i].isSelected = false;
              }
              setCurrSelectedColumn(colName);
            }
          }
          props.setUserCategoryList(newList);
        }
      },
    },
  ];

  const options = {
    title: "By Category Group",
    isStacked: true,
    legend: "none",
    backgroundColor: "transparent",
    hAxis: { textPosition: "none", gridlines: { count: 0 } },
    animation: {
      startup: true,
      easing: "inAndOut",
      duration: 1500,
    },
  };
  const optionsInd = {
    title:
      "By Category" +
      (currSelectedColumn == null ? "" : " (" + currSelectedColumn + ")"),
    isStacked: true,
    legend: "none",
    backgroundColor: "transparent",
    hAxis: { textPosition: "none", gridlines: { count: 0 } },
    animation: {
      startup: true,
      easing: "inAndOut",
      duration: 1500,
    },
  };

  const chartDataGroup = () => {
    let data = [];
    let rowCols = ["Grouping"];
    let rowData = [""];

    if (props.userCategoryList && props.userCategoryList.length > 0) {
      for (let i = 0; i < props.userCategoryList.length; i++) {
        rowCols.push(props.userCategoryList[i].name);
        let catAmtGroup = 0;
        for (let j = 0; j < props.userCategoryList[i].categories.length; j++) {
          let catAmt = getCategoryAmountModified(
            props.userCategoryList[i].categories[j]
          );
          catAmtGroup += catAmt;
        }
        rowData.push(catAmtGroup);
      }
    }

    rowCols.push("Unused");
    rowData.push(props.userDetails?.MonthlyAmount - props.grandTotal);

    data.push(rowCols, rowData);
    return data;
  };

  const chartDataIndividual = () => {
    let data = [];
    let rowCols = ["Grouping"];
    let rowData = [""];

    let anySelected =
      props.userCategoryList?.filter((x) => x.name == currSelectedColumn)
        .length > 0;
    if (props.userCategoryList && props.userCategoryList.length > 0) {
      for (let i = 0; i < props.userCategoryList.length; i++) {
        if (
          !anySelected ||
          props.userCategoryList[i].name == currSelectedColumn
        ) {
          for (
            let j = 0;
            j < props.userCategoryList[i].categories.length;
            j++
          ) {
            rowCols.push(props.userCategoryList[i].categories[j].name);
            let catAmt = getCategoryAmountModified(
              props.userCategoryList[i].categories[j]
            );
            rowData.push(catAmt);
          }
        }
      }
    }

    if (!anySelected) {
      rowCols.push("Unused");
      rowData.push(props.userDetails?.MonthlyAmount - props.grandTotal);
    }
    data.push(rowCols, rowData);

    return data;
  };

  if (props.userDetails?.MonthlyAmount == 0) {
    return <div></div>;
  }

  return (
    <div className="text-center h-[530px]">
      <div className="mt-12">
        {!props.forHelp && (
          <div className="flex justify-center items-center">
            <MyHelpIcon
              sizeInPx={35}
              helpModal={data.Modals.HELP_BUDGET_CHART_DETAILS}
            />
            <div className="font-bold text-2xl">Budget Amounts per Month</div>
          </div>
        )}

        <Chart
          chartType="BarChart"
          data={chartDataGroup()}
          options={options}
          width="100%"
          height="300px"
          legendToggle
          chartEvents={chartEvents}
        />
        <Chart
          className="-mt-10"
          chartType="BarChart"
          data={chartDataIndividual()}
          options={optionsInd}
          width="100%"
          height="300px"
          legendToggle
          chartEvents={chartEvents}
        />
      </div>
    </div>
  );
}

export default BarCharts;
