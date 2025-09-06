import {
  addBankAccount,
  addWalletAddress,
  addBankAccountToDatabase,
  deleteBankAccount,
  getBankAccount,
  getBankAccountFromDatabase,
  getOrganizationMembers,
  giveRole,
  onBoardingUser,
  changeBankAccount,
} from "../controllers/userGeneralController";

import express, { RequestHandler } from "express";
import {
  addGroup,
  saveEscrowToDatabase,
  deleteGroup,
  editReceiverAmountInGroup,
  getEscrowId,
  loadAllGroup,
  loadAllGroupTransactionHistory,
  loadSpecifiedGroup,
  removeReceiverDataFromGroup,
} from "../controllers/userSenderController";
import {
  loadAllWithdrawHistory,
  loadSpecificGroupInformation,
} from "../controllers/userReceiverController";

const router = express.Router();

type RouteMethod = "get" | "post" | "put" | "delete";

type RouteDefinition = {
  method: RouteMethod;
  path: string;
  action: RequestHandler;
};

const routes: RouteDefinition[] = [
  // userGeneralController
  {
    method: "post",
    path: "/onBoardingUser",
    action: onBoardingUser,
  },
  {
    method: "get",
    path: "/getOrganizationMembers",
    action: getOrganizationMembers,
  },

  {
    method: "post",
    path: "/addBankAccount",
    action: addBankAccount,
  },
  {
    method: "post",
    path: "/changeBankAccount",
    action: changeBankAccount,
  },

  {
    method: "post",
    path: "/addWalletAddress",
    action: addWalletAddress,
  },
  {
    method: "post",
    path: "/getEscrowId",
    action: getEscrowId,
  },
  {
    method: "post",
    path: "/getBankAccount",
    action: getBankAccount,
  },
  {
    method: "post",
    path: "/getBankAccountFromDatabase",
    action: getBankAccountFromDatabase,
  },
  {
    method: "post",
    path: "/addBankAccountToDatabase",
    action: addBankAccountToDatabase,
  },
  {
    method: "post",
    path: "/deleteBankAccount",
    action: deleteBankAccount,
  },
  {
    method: "post",
    path: "/addGroup",
    action: addGroup,
  },

  // userSenderController
  {
    method: "post",
    path: "/saveEscrowToDatabase",
    action: saveEscrowToDatabase,
  },
  {
    method: "post",
    path: "/loadAllGroupTransactionHistory",
    action: loadAllGroupTransactionHistory,
  },
  {
    method: "post",
    path: "/loadAllWithdrawHistory",
    action: loadAllWithdrawHistory,
  },
  {
    method: "post",
    path: "/loadAllGroup",
    action: loadAllGroup,
  },
  {
    method: "post",
    path: "/deleteGroup",
    action: deleteGroup,
  },
  {
    method: "post",
    path: "/editReceiverAmountInGroup",
    action: editReceiverAmountInGroup,
  },
  {
    method: "post",
    path: "/removeReceiverDataFromGroup",
    action: removeReceiverDataFromGroup,
  },
  // sender
  {
    method: "post",
    path: "/loadSpecifiedGroupForSender",
    action: loadSpecifiedGroup,
  },
  // receiver
  {
    method: "post",
    path: "/loadSpecifiedGroupForReceiver",
    action: loadSpecificGroupInformation,
  },
  {
    method: "post",
    path: "/giveRole",
    action: giveRole,
  },
];

routes.forEach((route) => {
  router[route.method](route.path, route.action);
});

export default router;
