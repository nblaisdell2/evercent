import { useEffect, useState } from "react";

import { updateObjectField, updateObjectFields } from "../../utils";
import { getGrandTotal } from "../../evercent";

import EditFrequency from "./EditFrequency";
import AmountsSection from "./AmountsSection";
import BarCharts from "./BarCharts";

function BudgetChart(props) {
  const [monthlyAmount, setMonthlyAmount] = useState(
    props.userDetails.MonthlyAmount
  );

  const [editingFrequency, setEditingFrequency] = useState(false);
  const [payFrequency, setPayFrequency] = useState(
    props.userDetails.PayFrequency
  );

  const [editingMonthlyAmount, setEditingMonthlyAmount] = useState(false);
  const [nextPaydate, setNextPaydate] = useState(props.userDetails.NextPaydate);

  const updateMonthlyIncome = (newMonthlyAmount) => {
    let newUserDetails = updateObjectField(
      props.userDetails,
      "MonthlyAmount",
      newMonthlyAmount
    );
    props.setUserDetails(newUserDetails);

    setEditingMonthlyAmount(false);
  };

  const updateFrequency = () => {
    let newUserDetails = updateObjectFields(props.userDetails, {
      PayFrequency: payFrequency,
      NextPaydate: nextPaydate,
    });
    props.setUserDetails(newUserDetails);

    setEditingFrequency(false);
  };

  const setUserNextPaydate = (nextDT) => {
    nextDT.setHours(0, 0, 0, 0);
    setNextPaydate(nextDT.toISOString());
  };

  useEffect(() => {
    console.log("next paydate changed!");
    console.log(nextPaydate);
    console.log(props.userDetails);
  }, [nextPaydate]);

  if (editingFrequency) {
    return (
      <EditFrequency
        payFrequency={payFrequency}
        setPayFrequency={setPayFrequency}
        nextPaydate={nextPaydate}
        setNextPaydate={setUserNextPaydate}
        updateFrequency={updateFrequency}
      />
    );
  }

  const grandTotal = getGrandTotal(props.userCategoryList);

  return (
    <div>
      <AmountsSection
        payFrequency={payFrequency}
        setEditingFrequency={setEditingFrequency}
        monthlyAmount={monthlyAmount}
        setMonthlyAmount={setMonthlyAmount}
        grandTotal={grandTotal}
        editingMonthlyAmount={editingMonthlyAmount}
        setEditingMonthlyAmount={setEditingMonthlyAmount}
        updateMonthlyIncome={updateMonthlyIncome}
      />

      {/* Google Charts section */}
      <BarCharts grandTotal={grandTotal} {...props} />
    </div>
  );
}

export default BudgetChart;
