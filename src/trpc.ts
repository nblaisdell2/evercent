import { initTRPC } from "@trpc/server";
import { z } from "zod";
import * as trpcExpress from "@trpc/server/adapters/express";
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

// created for each request
export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({}); // no context
type Context = Awaited<ReturnType<typeof createContext>>;

export const ctx = initTRPC.context<Context>().create();
// type TContext = typeof ctx;

// export const getProc = (
//   fn: (...args: any) => Promise<EvercentResponse<any>>,
//   mutate: boolean
// ) => {
//   if (mutate) {
//     return ctx.procedure
//       .input(z.custom<Parameters<typeof fn>[0]>())
//       .mutation(async (opts) => {
//         const response = await fn(opts.input);
//         if (response.err) sendErrorEmail(mutate, response, opts);
//         return response;
//       });
//   } else {
//     return ctx.procedure
//       .input(z.custom<Parameters<typeof fn>[0]>())
//       .query(async (opts) => {
//         const response = await fn(opts.input);
//         if (response.err) sendErrorEmail(mutate, response, opts);
//         return response;
//       });
//   }
// };

export const appRouter = ctx.router({
  getAPIStatus: ctx.procedure.query(async (opts) => {
    const response = await checkAPIStatus();
    if (response.err) sendErrorEmail(false, response, opts);
    return response;
  }),
  user: ctx.router({
    getAllUserData: ctx.procedure
      .input(z.custom<Parameters<typeof getAllEvercentData>[0]>())
      .query(async (opts) => {
        const response = await getAllEvercentData(opts.input);
        if (response.err) sendErrorEmail(false, response, opts);
        return response;
      }),
    updateUserDetails: ctx.procedure
      .input(z.custom<Parameters<typeof updateUserDetails>[0]>())
      .mutation(async (opts) => {
        const response = await updateUserDetails(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
    updateCategoryDetails: ctx.procedure
      .input(z.custom<Parameters<typeof updateCategoryDetails>[0]>())
      .mutation(async (opts) => {
        const response = await updateCategoryDetails(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
    updateMonthsAheadTarget: ctx.procedure
      .input(z.custom<Parameters<typeof updateMonthsAheadTarget>[0]>())
      .mutation(async (opts) => {
        const response = await updateMonthsAheadTarget(opts.input);
        if (response.err) sendErrorEmail(true, response, opts);
        return response;
      }),
  }),
  //   budget: ctx.router({
  //     //   connectToYNAB: getProc(connecttoyna, false),
  //     getBudgetsList: getProc(getBudgetsList, false),
  //     switchBudget: getProc(switchBudget, true),
  //     authorizeBudget: getProc(authorizeBudget, true),
  //     updateBudgetCategoryAmount: getProc(updateBudgetCategoryAmount, true),
  //   }),
  //   autoRun: ctx.router({
  //     saveAutoRunDetails: getProc(saveAutoRunDetails, true),
  //     cancelAutoRuns: getProc(cancelAutoRuns, true),
  //     lockAutoRuns: getProc(lockAutoRuns, true),
  //     runAutomation: getProc(runAutomation, true),
  //   }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
