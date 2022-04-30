import React from "react";
import data from "../../data.json";
import Image from "next/image";
import AmountsSection from "../budget-helper/AmountsSection";
import EditFrequency from "../budget-helper/EditFrequency";
import BarCharts from "../budget-helper/BarCharts";
import CalendarIcon from "@heroicons/react/solid/CalendarIcon";
import GiftIcon from "@heroicons/react/solid/GiftIcon";

function HelpModal(props) {
  const getHelpText = (modalHeading) => {
    switch (modalHeading) {
      case data.Modals.HELP_AMTS_PAY_FREQ:
        return (
          <div>
            <div>This how often you get paid</div>
            <br />
            <div>
              <div>
                By editing this section, you can choose your <b>next paydate</b>
                , as well as select one of the following <b>frequencies</b> for
                how often you receive a paycheck:
              </div>
              <ul className=" list-disc list-inside ml-5">
                <li>Weekly</li>
                <li>Bi-weekly (Every 2 Weeks)</li>
                <li>Monthly</li>
              </ul>
            </div>
            <div className="mt-6 p-2 rounded-md overflow-visible pointer-events-none bg-gray-200">
              <div className=" uppercase font-bold opacity-30 text-black text-center">
                Preview
              </div>
              <EditFrequency
                payFrequency={"Every 2 Weeks"}
                nextPaydate={new Date()}
                forHelp={true}
              />
            </div>
          </div>
        );
      case data.Modals.HELP_AMTS_MONTHLY_INCOME:
        return (
          <div>
            <div>
              This is <i>roughly</i> the amount that you would expect to take
              home from your job in a given month. It shouldn't be an exact
              number, and should be slightly rounded down from your actual
              monthly amount, just in case.
            </div>
            <br />
            <div>
              To determine this amount:
              <ol className="list-decimal list-inside ml-4">
                <li>
                  Think about how much you would make during an average paycheck
                </li>
                <li>
                  Then, based on your pay frequency, multiply the amount from
                  step 1 by the amount of paychecks you would get in a month.
                  <ol className="list-disc list-inside ml-4">
                    <li>
                      For example, if you make $1000 every 2 weeks, then you
                      would set the Monthly Income to $2000, since you get 2
                      paychecks for the month.
                    </li>
                  </ol>
                </li>
              </ol>
            </div>
            <br />
            <div>
              This amount will make up the amount for the entire BarChart, like
              in the example chart below. As categories are added to the chart,
              some amount will be taken away from this total.
            </div>
            <BarCharts
              userDetails={{
                MonthlyAmount: 2000,
              }}
              grandTotal={0}
              forHelp={true}
              {...props}
            />
          </div>
        );
      case data.Modals.HELP_AMTS_AMOUNT_REMAINING:
        return "The amount remaining takes the total from the categories selected on the right-hand side and subtracts that from your monthly income, to determine how much you still have to work with.";
      case data.Modals.HELP_AMTS_AMOUNT_USED:
        return "This is the total from all the categories selected on the right-hand side.";
      case data.Modals.HELP_AMTS_PERCENT_USED:
        return (
          <div>
            This gives the <b>Amount Used</b> but as a percentage of your total
            Monthly Income. Using this number, we can see <u>percentage-wise</u>{" "}
            how much we have used and still have to work with, rather than the
            actual number of dollars.
          </div>
        );
      case data.Modals.HELP_BUDGET_CHART_DETAILS:
        return (
          <div>
            <div>
              These charts will show how much each of the categories that make
              up your expenses are taking up your entire monthly income. That
              way, you can get a quick look at exactly how much money is being
              spent on each of these categories all in one view.
            </div>
            <br />
            <div className="text-center text-2xl font-bold mb-2 mt-6">
              Starting View
            </div>
            <div className="bg-gray-200 rounded-md p-2">
              <div>
                When no categories have been added to the chart, there will be a
                single color (bar) which makes up your total unused amount from
                your Monthly Income.
              </div>
              <div className="-mt-10">
                <BarCharts
                  userDetails={{
                    MonthlyAmount: 2000,
                  }}
                  grandTotal={0}
                  forHelp={true}
                  {...props}
                />
              </div>
            </div>
            <br />
            <div className="text-center text-2xl font-bold mb-2 mt-6">
              Chart w/ Categories Added
            </div>
            <div className="bg-gray-200 rounded-md p-2">
              <div>
                As categories are added on the right-hand side, some new bars
                (colors) will start to show on the left-hand side of the chart,
                and will start to take up some chunk of your total Monthly
                Income.
              </div>
              <br />
              <div>
                The top chart shows the amounts at a category group level, and
                the lower chart shows the same exact amounts, but at an
                individual category level. If you see where one bar ends on the
                top chart, and scroll your eyes down to the bottom chart at that
                same point, that will be all the categories for that particular
                group. However, if you want a clearer view on the individual
                categories in a group, you can click on the bar in that group
                and the below chart will adjust to only show the categories in
                that group!
              </div>
              <div className="-mt-10">
                {/* TODO: Need to add some *fake* categories for this chart */}
                <BarCharts
                  userDetails={{
                    MonthlyAmount: 2000,
                  }}
                  grandTotal={650}
                  forHelp={true}
                  {...props}
                />
              </div>
            </div>
            <br />
            <div>
              <div>
                As you enter all of your categories and their appropriate
                amounts, what you'll see is a number of colors/categories in the
                chart, and possibly a final color/category, which represents the
                amount you still have leftover, after ALL the expenses have been
                accounted for. And that's every MONTH!!
              </div>
            </div>
            <br />
          </div>
        );
      case data.Modals.HELP_BUDGET_CATEGORIES:
        return (
          <div>
            <div>
              This is a list of categories (from YNAB) that are being used for
              the Budget Amounts chart on the left-hand side.
            </div>
            <br />
            <div>
              At first, this list will be empty. To add items to the list, click
              the <u>Add/Remove YNAB Categories</u> button on the bottom-right
              of the screen. From there, you can select/de-select any categories
              from YNAB to add or remove them from this list.
            </div>
            <br />
            <div>
              Once they're added to the list, you can click on the different
              groups to expand them, and then click on the individual categories
              to edit the amounts and other options for each one.
            </div>
            <div>
              <div className="text-2xl font-bold text-center mb-2">
                Budget Categories List Columns
              </div>
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td className="font-bold p-2 border border-black">
                        Category
                      </td>
                      <td className="p-2 border border-black">
                        This is the name of the Category Group (<b>bold</b>) or
                        the name of the individual category from YNAB.
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold p-2 border border-black">
                        Options
                      </td>
                      <td className="p-2 border border-black">
                        This column shows whether or not a category has a
                        particular option set, to get a quick view of which
                        categories have these options set. There are two
                        possible options for each category:
                        <ul className="list-disc list-inside ml-5">
                          <li className="flex items-center">
                            <CalendarIcon
                              height={20}
                              width={20}
                              className="inline"
                              color={"#097fd9"}
                            />
                            Regular Expenses
                          </li>
                          <li className="flex items-center">
                            <GiftIcon
                              height={20}
                              width={20}
                              className="inline"
                              color={"#c857f5"}
                            />
                            Upcoming Expenses
                          </li>
                        </ul>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold p-2 border border-black">
                        Amount
                      </td>
                      <td className="p-2 border border-black">
                        <div>
                          This shows the amount this category takes up, and will
                          be reflected on the chart on the left-hand side. As
                          more amounts are added to this list, it will take some
                          chunk away from what's still available on the chart,
                          which is your Monthly Income.
                        </div>
                        <br />
                        <div>
                          <b>Note:</b> In some cases, the amount will be
                          automatically adjusted based on when an expense is
                          due.
                          <br />
                          For example, if you pay $300 for some category every 3
                          months, then the $300 will be adjusted to $100 and
                          look something like <br />
                          "$100 ($300)".
                          <ul className="list-disc list-inside ml-5">
                            <li>
                              The first number (outside of parentheses) is what
                              will be taken from your monthly income, and that's
                              what will be shown on the chart for that category.
                            </li>
                            <li>
                              The second number (in parentheses) is just there
                              to show you the original amount that you entered.
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-bold p-2 border border-black">
                        % of Income
                      </td>
                      <td className="p-2 border border-black">
                        Shows the % of your monthly income is taken up by each
                        particular category or group. If a category has an
                        adjusted amount per month (number in parentheses,
                        explained above), the percentage will be based on the
                        amount in the parentheses.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <br />
            </div>
          </div>
        );
        return "  Add items are added to this list from the 'Add/Remove YNAB Categories' button, they will start populating on this list below. Each of the amounts and other settings for each of these categories can be edited once they are added to the list, and the amounts will start to show on the chart on the left. \
          Category    - This is the name of the category/sub-category from YNAB\
          Options     - This will have an icon to show whether or not this category has been marked as 'Regular Expense' or 'Upcoming Expense'\
          Amount      - This is the amount that is being used up for this category out of your entire monthly income. When there is a parentheses, that means that the amount per month has been altered by the tool, and this new amount will be the actual amount that comes out of your monthly income.\
          % of Income - This is a % of how much this particular category/sub-category makes up out of your entire monthly income";
      case data.Modals.HELP_REG_EXPENSES:
        return (
          <div>
            <div>
              This chart will show all of the categories that were marked as a
              'Regular Expense' and show how close to being 6 months ahead on
              each of those categories that you are. Once all of the categories
              have hit the dashed line, then you have officially met the goal of
              being 6 months ahead on all of your expenses!
            </div>
            <br />
            <div>
              For this tool, to be considered a month ahead on a category, that
              category must be "fully-funded" for any months past (
              <u>and not including</u>) the current month. For example, if it's
              January, and a category is funded for January, February, and
              March, that would be considered 2 months ahead.
            </div>
          </div>
        );
      case data.Modals.HELP_AUTOMATION_SETUP:
        return "  - This should show up when I click on the 'Automate?' button\
        Once all the categories have been selected on the 'BudgetChart' screen, we'll know exactly how much we'll need for all of our expenses every single month, and ideally, we would enter these amounts into YNAB when we get paid, each and every paycheck.\
        \
        Because of this, we can automate the process entirely, where this tool will take the information from that chart and on a specific date/time (or on a schedule), we can automatically enter the amounts from the chart into the *actual* categories in YNAB. That way, the only thing we'll need to make sure is that we continue to add our transactions and our paycheck transaction, as the exact amount may not be known on payday, but we do still need to enter the exact amounts into YNAB, just as normal. Then, on payday, instead of working through each of the categories and assigning those dollars to categories in the budget, this tool will do that automatically!\
        \
          - Explain the 'Choose a Day/Choose a Time' & 'Scheduled vs. One-Time'\
        If One-Time is chosen, then the automation will only run a single time, on the specific date/time chosen, and after that, the automation will be turned off. This option can be used if you want to test things out before scheduling things.\
        \
        Scheduled will take the information from the 'Pay Frequency' (Weekly, 2 Weeks, Monthly) and the selected next paydate, and will only ask for the time that the user wants to run the automation at. Once that time is selected, another screen will allow time to review, and will display the next 10 times that the automation will run. However, the automation is indefinite, and will only stop after it's been explicitly turned off, not only the next 10 times.\
        \
          - How does it work?\
        For each category and the amount that will be posted for that category, the following will be considered:\
          - First, it will start by looking at the current month in YNAB and check that category to see if the amount has already been met for that particular month\
            - Special circumstance for non-regular expenses and 'Always Use Current Month' categories, which will override looking at future months\
          - If the amount has already been met for this month, it will continue onto the next future month and do the same check. This check will continue until a month that hasn't been fully funded for this category has been found. *Note* This is how the 6-Months Ahead goal will be met!\
        \
          - Once the appropriate month is found, we'll start by taking the 'Total Amount to Post' for this category, which is the amount per paycheck + any extra amount (see extra amount) that was added. Then, we'll determine how much *should* be posted for each month, by checking the amount per paycheck without any extra amount.\
        \
          - Then, we'll see how much is already budgeted in YNAB for this category and compare that to how much we still have to post (Total Amount to Post). Once the new budgeted amount is determined, this is then actually posted to YNAB.\
        \
          - Lastly, if there is still some left over money to post to this category, it will continue to add it into the future months automatically. Otherwise, if there is no money left for this category, then we'll continue to the next category.";
      case data.Modals.HELP_CAT_AMOUNT:
        return "This should be the total amount that needs to be paid per month (monthly) OR the total amount for the entire bill if non-monthly. For example, if you pay something Yearly, you should enter the total amount that the yearly cost would be, not the amount per month.";
      case data.Modals.HELP_CAT_EXTRA_AMOUNT:
        return "This is any amount that you would like to add extra to this category, per month. The 'Amount' section should already account for the entire bill, so this section should be used for the purpose of getting ahead on this category, or trying to speed up the savings.";
      case data.Modals.HELP_CAT_PERCENT_INCOME:
        return "This slider will adjust the 'Amount' section, and will represent the % of your total Monthly Income. This can be used when you want to use some amount, but you aren't sure exactly how much you'd like to put. Instead, you can consider how much you still have percentage-wise, add that % using the slider, and it will automatically tell you what that amount would be, and adds it to the 'Amount' section.";
      case data.Modals.HELP_CAT_OPTION_REGULAR:
        return "Checking this option will add this category to the 'Upcoming Expenses' section, but only if an amount is also added to the section that pops up when this option is selected.\
              - Upcoming Expense Amount\
        This should be the total amount of whatever you are trying to save up for and purchase. The 'Amount' section should be unchanged, and still represent the amount you decide you'd like to put away per month to save up for this. THIS amount is the total amount for the actual purchase itself.\
        \
        Once this information is entered, then more details about how soon this purchase can be made can be found in the 'Upcoming Expenses' section of the site.";
      case data.Modals.HELP_CAT_OPTION_UPCOMING:
        return "Checking this option will add this category to the 'Regular Expenses', and should be marked for any expense that you would like to be 6 months ahead on. This should not be limited to just your main bills, but anything that is in your budget that if you were to lose your job, you would still be able to cover all of these things for a number of months into the future.";
      case data.Modals.HELP_CAT_FREQUENCY:
        return "This lets the tool know if your bill is one that's paid every month, or one that is paid on any other schedule (every 3 months, every 6 months, yearly, quarterly, etc.)";
      case data.Modals.HELP_CAT_DUE_DATE:
        return "By choosing the exact date that a bill is due on, the tool can determine how much needs to be saved per paycheck so that you know you'll have enough by the time the bill is due. As the bill date is met, that expense date will automatically be adjusted by the tool to the next appropriate expense date. ";
      case data.Modals.HELP_CAT_REPEAT_EVERY:
        return "This tells the tool how often a particular expense should be repeat. This is where you would determine if you pay something every 6 months, every 3 months, every 4 months, yearly (every 12 months), every 5 years, etc.";
      case data.Modals.HELP_CAT_INCLUDE:
        return "If this is unchecked, the 'Amount' will remain but that amount will be removed from the actual chart. This is for the purposes of showing the details on the 'Six Month Details' section, but not actually actively using it as part of your budget currently. For example, if you're saving up for a bill that you don't actually have yet (which is really thinking ahead), if you meet your six month goal before you actually have to start paying, you can choose to uncheck this to remove it from your budget, since you no longer need to fund the category for the time being, and you can still see your progress in the Six Month Details section. Otherwise, if you were to change the 'Amount' to 0, then there would be no way to tell how far towards the six month ahead you are.";
      case data.Modals.HELP_CAT_ALWAYS_USE_CURRENT:
        return "For certain expenses, such as Auto Maintenance, there is no reason to save the money into a future month, because I'll need all that I was able to save up until that point when the time comes, so I'll always want to save it in the current month. By selecting this option, the automation will always choose to post the amount in YNAB in the current month, rather than trying to determine which future month to post the money in.";
      case data.Modals.HELP_CAT_MULTIPLE_TRANSACTIONS:
        return "Multiple Transactions explanation";
      default:
        break;
    }
  };

  console.log("HelpModal props", props);

  return (
    <div className="h-[650px]">
      <div className="text-center font-bold text-3xl mb-8">Help</div>

      {[
        data.Modals.HELP_AMTS_AMOUNT_REMAINING,
        data.Modals.HELP_AMTS_AMOUNT_USED,
        data.Modals.HELP_AMTS_MONTHLY_INCOME,
        data.Modals.HELP_AMTS_PAY_FREQ,
        data.Modals.HELP_AMTS_PERCENT_USED,
      ].includes(props.modalText) && (
        <div className="mb-4">
          <div className="m-2 border-t border-gray-300"></div>
          <div>
            <AmountsSection
              payFrequency={"Every 2 Weeks"}
              monthlyAmount={2000}
              grandTotal={400}
              forHelp={props.modalText}
            />
          </div>
          <div className="m-2 border-t border-gray-300"></div>
        </div>
      )}

      <div className="font-semibold text-lg">{props.modalText}</div>
      <div>{getHelpText(props.modalText)}</div>
    </div>
  );
}

export default HelpModal;
