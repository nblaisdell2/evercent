import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { logError } from "./utils/log";
import { sendEmailMessage } from "./utils/email";
import { EvercentResponse, getAllEvercentData } from "./evercent";
import { updateMonthsAheadTarget, updateUserDetails } from "./user";
import { updateCategoryDetails } from "./category";
import {
  authorizeBudget,
  getBudgetsList,
  switchBudget,
  updateBudgetCategoryAmount,
} from "./budget";
import {
  cancelAutoRuns,
  lockAutoRuns,
  runAutomation,
  saveAutoRunDetails,
} from "./autoRun";

const sendErrorEmail = async (
  mutate: boolean,
  response: EvercentResponse<any>,
  opts: any
) => {
  const errorMessage = `(${500}) - GET /${opts.path} :: ${response.err}`;
  logError(errorMessage);

  const method = mutate ? "POST" : "GET";
  const errMsgHTML = `
  <b style="color:${
    method == "GET" ? "green" : "orange"
  }">${method}</b> <span>/${(opts as any).path}</span><br/>
  <u><b>Error</b></u>: <span>${response.err}</span><br/><br/>
  <u><b>Inputs</b></u>: <span style="font-size: 85%; font-family: 'Courier New'">${JSON.stringify(
    opts.input
  )}</span>
  `;

  await sendEmailMessage({
    from: "Evercent API <nblaisdell2@gmail.com>",
    to: "nblaisdell2@gmail.com",
    subject: "Error!",
    message: errMsgHTML,
    attachments: [],
    useHTML: true,
  });
};

const checkAPIStatus = async (): Promise<EvercentResponse<string>> => {
  const msg = "API is up-and-running!";
  return {
    data: msg,
    err: null,
    message: msg,
  };
};

export type FnType<T> = T extends (...args: any) => any
  ? FnType<ReturnType<T>>
  : T extends Promise<infer K>
  ? FnType<Awaited<K>>
  : T extends EvercentResponse<infer K>
  ? T["data"]
  : T;

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  getAPIStatus: publicProcedure.query(async (opts) => {
    const response = await checkAPIStatus();
    if (response.err) sendErrorEmail(false, response, opts);
    return response;
  }),
  user: router({
    getAllUserData: publicProcedure
      .input(z.custom<Parameters<typeof getAllEvercentData>[0]>())
      .query(async (opts) => {
        const response = await getAllEvercentData(opts.input);
        if (response.err) sendErrorEmail(false, response, opts);
        return response;
      }),
    updateUserDetails: publicProcedure
      .input(z.custom<Parameters<typeof updateUserDetails>[0]>())
      .mutation(async (opts) => {
        const response = await updateUserDetails(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
    updateCategoryDetails: publicProcedure
      .input(z.custom<Parameters<typeof updateCategoryDetails>[0]>())
      .mutation(async (opts) => {
        const response = await updateCategoryDetails(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
    updateMonthsAheadTarget: publicProcedure
      .input(z.custom<Parameters<typeof updateMonthsAheadTarget>[0]>())
      .mutation(async (opts) => {
        const response = await updateMonthsAheadTarget(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
  }),
  //   budget: router({
  //     //   connectToYNAB: getProc(connecttoyna, false),
  //     getBudgetsList: getProc(getBudgetsList, false),
  //     switchBudget: getProc(switchBudget, true),
  //     authorizeBudget: getProc(authorizeBudget, true),
  //     updateBudgetCategoryAmount: getProc(updateBudgetCategoryAmount, true),
  //   }),
  //   autoRun: router({
  //     saveAutoRunDetails: getProc(saveAutoRunDetails, true),
  //     cancelAutoRuns: getProc(cancelAutoRuns, true),
  //     lockAutoRuns: getProc(lockAutoRuns, true),
  //     runAutomation: getProc(runAutomation, true),
  //   }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
