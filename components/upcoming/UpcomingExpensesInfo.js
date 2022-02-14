import {
  getAmountByFrequency,
  calculateUpcomingExpensesForCategory,
} from "../../evercent";
import { getMoneyString } from "../../utils";
import NumberInput from "../util/NumberInput";

function UpcomingExpensesInfo(props) {
  const upcomingList = props.upcomingDetails.categories;

  if (!props.upcomingDetails.selectedCategory) {
    if (!upcomingList || upcomingList.length == 0) {
      return (
        <div className="flex flex-col h-full items-center justify-center">
          <div className="text-2xl mb-10">
            You have no categories marked as an <b>Upcoming Expense</b>!
          </div>
          <div className="w-full mb-10">
            <div>On the Budget Helper tab...</div>
            <ul className="list-disc list-inside ml-5">
              <li>Select a Category</li>
              <li>{'Choose "Upcoming Expense" from the Options section'}</li>
              <li>
                {
                  'Then, enter the "Total Expense Amount", or the price of the entire expense.'
                }
              </li>
            </ul>
          </div>

          <div className="text-center">
            {
              'For every category marked as an "Upcoming Expense", you can come back here and see how long it will take to be able to purchase that expense!'
            }
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex justify-center mt-20 text-2xl">
          <div>Select an Item/Category on the left to get more details</div>
        </div>
      );
    }
  }

  let extraAmount = props.upcomingDetails.extraAmount;
  let selCat = props.upcomingDetails.selectedCategory;
  let upExpenseInd = selCat.extraDetails;
  let dataUser = calculateUpcomingExpensesForCategory(
    selCat,
    props.userDetails.NextPaydate,
    props.userDetails.PayFrequency,
    extraAmount
  );

  return (
    <div>
      {/* Top Section */}
      <div className="flex justify-between">
        <div>
          <div className="uppercase text-md">
            {
              props.userCategoryList.find(
                (x) => x.id == upExpenseInd.ItemGroupID
              ).name
            }
          </div>
          <div className="text-4xl font-bold">{selCat.name}</div>
        </div>
        <div className="w-72 flex flex-col justify-evenly">
          <div className="flex justify-between border-b border-black">
            <div className="text-xl font-semibold">Amount per Month</div>
            <div className="font-bold text-green-500 text-xl">
              {getMoneyString(selCat.categoryAmount)}
            </div>
          </div>
          <div className="flex justify-between border-b border-black">
            <div className="text-xl font-semibold">Amount per Paycheck</div>
            <div className="font-bold text-green-500 text-xl">
              {getMoneyString(
                getAmountByFrequency(
                  selCat.categoryAmount,
                  props.userDetails.PayFrequency
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="mt-7">
        <div className="text-center text-2xl underline font-bold mb-2">
          Details
        </div>
        <div>
          <div className="flex justify-evenly mb-4">
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1">Total Amount</div>
              <div className="text-black font-bold text-xl">
                {getMoneyString(upExpenseInd.ItemAmountTotal)}
              </div>
            </div>
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1">Amount Saved</div>
              <div className="text-black font-bold text-xl">
                {getMoneyString(upExpenseInd.ItemAmountSaved)}
              </div>
            </div>
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1">% Saved</div>
              <div className="text-black font-bold text-xl">
                {upExpenseInd.ItemPercentSaved}
              </div>
            </div>
          </div>
          <div className="flex justify-evenly">
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1">Purchase Date</div>
              <div className="text-black font-bold text-xl">
                {upExpenseInd.ItemDate}
              </div>
            </div>
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1"># of Days Left</div>
              <div className="text-black font-bold text-xl">
                {upExpenseInd.NumDays}
              </div>
            </div>
            <div className="flex flex-col items-center w-48 border border-black rounded-md">
              <div className="uppercase -mb-1"># of Paychecks Left</div>
              <div className="text-black font-bold text-xl">
                {upExpenseInd.NumPaychecks.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What if I save more? table */}
      <div className="mt-20">
        <div className="text-center text-2xl underline font-bold mb-2">
          What If I Save More?
        </div>
        <div className="h-[300px] overflow-y-auto">
          <table>
            <thead>
              <tr className="border-b border-black">
                <th className="sticky top-0 bg-white">Extra Amount</th>
                <th className="sticky top-0 bg-white">New Amount</th>
                <th className="sticky top-0 bg-white">New Purchase Date</th>
                <th className="sticky top-0 bg-white">Days Until Purchase</th>
                <th className="sticky top-0 bg-white">Days Saved</th>
                <th className="sticky top-0 bg-white"># of Paychecks</th>
              </tr>
            </thead>

            <tbody>
              {[0, 100, 200, 300, 400, 500].map((v, i) => {
                let data = calculateUpcomingExpensesForCategory(
                  selCat,
                  props.userDetails.NextPaydate,
                  props.userDetails.PayFrequency,
                  v
                );
                return (
                  <tr key={i} className="text-center border-b border-black">
                    <td className="p-1">{getMoneyString(v)}</td>
                    <td className="p-1">
                      {getMoneyString(
                        v +
                          getAmountByFrequency(
                            selCat.categoryAmount,
                            props.userDetails.PayFrequency
                          )
                      )}
                    </td>
                    <td className="p-1">{data.ItemDate}</td>
                    <td className="p-1">{data.NumDays}</td>
                    <td className="p-1">
                      {parseInt(upExpenseInd.NumDays) - parseInt(data.NumDays)}
                    </td>
                    <td className="p-1">{data.NumPaychecks.toFixed(0)}</td>
                  </tr>
                );
              })}
              <tr className="text-center border-b border-black">
                <td>
                  <NumberInput
                    value={getMoneyString(extraAmount)}
                    setValue2={(newVal) => {
                      console.log("newVal", newVal);
                      let extraAmt =
                        newVal?.replace("$", "") == "" || newVal == undefined
                          ? 0
                          : parseInt(newVal.replace("$", ""));
                      console.log("extraAmt", extraAmt);

                      let newUpcomingDt = { ...props.upcomingDetails };
                      newUpcomingDt.extraAmount = extraAmt;
                      props.setUpcomingDetails(newUpcomingDt);
                    }}
                    className="text-center border border-black rounded-md p-1 w-24"
                  />
                </td>
                <td>
                  {extraAmount == 0
                    ? "----"
                    : getMoneyString(
                        extraAmount +
                          getAmountByFrequency(
                            selCat.categoryAmount,
                            props.userDetails.PayFrequency
                          )
                      )}
                </td>
                <td>{extraAmount == 0 ? "----" : dataUser.ItemDate}</td>
                <td>{extraAmount == 0 ? "----" : dataUser.NumDays}</td>
                <td>
                  {extraAmount == 0
                    ? "----"
                    : parseInt(upExpenseInd.NumDays) -
                      parseInt(dataUser.NumDays)}
                </td>
                <td>
                  {extraAmount == 0 ? "----" : dataUser.NumPaychecks.toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UpcomingExpensesInfo;
