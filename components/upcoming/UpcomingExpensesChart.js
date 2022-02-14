import { getNextPaydateString } from "../../evercent";

function UpcomingExpensesChart(props) {
  const setSelectedUpcomingExpense = (selCat) => {
    let newUpcomingDt = { ...props.upcomingDetails };
    newUpcomingDt.selectedCategory = selCat;
    newUpcomingDt.extraAmount = 0;
    props.setUpcomingDetails(newUpcomingDt);
  };

  return (
    <div>
      <div className="flex justify-evenly">
        <div className="text-center font-bold text-3xl underline">
          Upcoming Expenses
        </div>
        <div className="text-center">
          <div className="underline font-bold">Next Paydate</div>
          <div className=" text-lg">
            {getNextPaydateString(props.userDetails.NextPaydate)}
          </div>
        </div>
      </div>

      <hr className="mt-3" />

      <div className="flex flex-col my-4 h-[500px] overflow-y-auto">
        <table className="relative table-auto">
          <thead>
            <tr>
              <th className="sticky top-0 bg-white text-left">Item/Category</th>
              <th className="sticky top-0 bg-white text-right">Total Amount</th>
              <th className="sticky top-0 bg-white text-right">
                Purchase Date
              </th>
              <th className="sticky top-0 bg-white text-right">
                Days Until Purchase
              </th>
              <th className="sticky top-0 bg-white text-right">
                <div className="mr-3"># of Paychecks Until Purchase</div>
              </th>
            </tr>
          </thead>

          <tbody>
            {props.upcomingDetails.categories.map((vb, i) => {
              let v = vb.extraDetails;
              let sel = props.upcomingDetails.selectedCategory;
              return (
                <tr
                  key={i}
                  className={`hover:bg-gray-200 ${
                    sel != null &&
                    v.ItemGroupID == sel.categoryGroupID &&
                    v.ItemID == sel.id
                      ? "bg-gray-300"
                      : ""
                  } hover:cursor-pointer`}
                  onClick={() => setSelectedUpcomingExpense(vb)}
                >
                  <td className="p-1">{v.ItemName}</td>
                  <td className="text-right p-1">{v.ItemAmount}</td>
                  <td className="text-right p-1">{v.ItemDate}</td>
                  <td className="text-right p-1">{v.NumDays}</td>
                  <td className="text-right p-1">
                    <div className="mr-3">{v.NumPaychecks}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UpcomingExpensesChart;
