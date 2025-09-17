import {
  addBankAccount,
  addWalletAddress,
  addBankAccountToDatabase,
  deleteBankAccount,
  getBankAccount,
  getBankAccountFromDatabase,
  getOrganizationMembers,
  updateWalletAddressRole,
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
  loadSpecifiedGroupTransactionHistory,
} from "../controllers/userSenderController";
import {
  loadAllIncomingTransaction,
  loadAllJoinedGroupInformation,
  loadAllWithdrawHistory,
  loadSpecificGroupInformation,
} from "../controllers/userReceiverController";
import {
  goldskyEscrowCreatedWebhook,
  // goldskyEscrowReceiverAddedWebhook,
} from "../controllers/thirdPartyController";

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
    method: "post",
    path: "/addBankAccount",
    action: addBankAccount,
  },
  {
    method: "post",
    path: "/addWalletAddress",
    action: addWalletAddress,
  },

  {
    method: "post",
    path: "/updateWalletAddressRole",
    action: updateWalletAddressRole,
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
    path: "/deleteBankAccount",
    action: deleteBankAccount,
  },
  {
    method: "post",
    path: "/addBankAccountToDatabase",
    action: addBankAccountToDatabase,
  },

  {
    method: "post",
    path: "/changeBankAccount",
    action: changeBankAccount,
  },

  {
    method: "get",
    path: "/getOrganizationMembers",
    action: getOrganizationMembers,
  },

  // userSenderController
  {
    method: "post",
    path: "/addGroup",
    action: addGroup,
  },
  {
    method: "post",
    path: "/saveEscrowToDatabase",
    action: saveEscrowToDatabase,
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
  {
    method: "post",
    path: "/getEscrowId",
    action: getEscrowId,
  },
  {
    method: "post",
    path: "/loadAllGroup",
    action: loadAllGroup,
  },
  {
    method: "post",
    path: "/loadSpecifiedGroupForSender",
    action: loadSpecifiedGroup,
  },
  {
    method: "post",
    path: "/deleteGroup",
    action: deleteGroup,
  },
  {
    method: "post",
    path: "/loadAllIncomingTransaction",
    action: loadAllIncomingTransaction,
  },
  {
    method: "post",
    path: "/loadAllGroupTransactionHistory",
    action: loadAllGroupTransactionHistory,
  },
  {
    method: "post",
    path: "/loadSpecifiedGroupTransactionHistory",
    action: loadSpecifiedGroupTransactionHistory,
  },

  // userReceiverController
  {
    method: "post",
    path: "/loadAllJoinedGroupInformation",
    action: loadAllJoinedGroupInformation,
  },
  {
    method: "post",
    path: "/loadSpecificGroupInformation",
    action: loadSpecificGroupInformation,
  },
  {
    method: "post",
    path: "/loadSpecificGroupInformation",
    action: loadSpecificGroupInformation,
  },

  {
    method: "post",
    path: "/loadAllWithdrawHistory",
    action: loadAllWithdrawHistory,
  },

  {
    method: "post",
    path: "/loadSpecifiedGroupForReceiver",
    action: loadSpecificGroupInformation,
  },

  {
    method: "post",
    path: "/webhook/goldsky-escrow-created",
    action: goldskyEscrowCreatedWebhook,
  },
  // {
  //   method: "post",
  //   path: "/webhook/goldsky-escrow-receiver-added",
  //   action: goldskyEscrowReceiverAddedWebhook,
  // },
];

routes.forEach((route) => {
  router[route.method](route.path, route.action);
});

export default router;
