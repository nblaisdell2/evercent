import { updateMonthsAheadTarget } from "./user";

const userID = "902FA28A-92CB-4E70-9CC8-8387FFFF1DA8";
const budgetID = "ff9321a7-a162-4f98-8bda-571539aaa1d6";
const res = updateMonthsAheadTarget(userID, budgetID, -10)
  .then(({ data: newTarget, err }) => {
    if (err) throw err;

    console.log("Got new target!");
    console.log(newTarget);

    return newTarget;
  })
  .catch((err) => {
    console.log("GOT ERROR!");
    console.log(err);
  });

export * from "./user";
export * from "./budget";
export * from "./ynab";
export * from "./budget";
export * from "./category";
export * from "./autoRun";
export * from "./evercent";
