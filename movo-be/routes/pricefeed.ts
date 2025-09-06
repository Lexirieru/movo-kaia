import express, { RequestHandler } from "express";
import {
  getAllRatesToUsdc,
  getIdrxRateFromUSDC,
} from "../controllers/pricefeedController";

const router = express.Router();

type RouteMethod = "get" | "post" | "put" | "delete";

type RouteDefinition = {
  method: RouteMethod;
  path: string;
  action: RequestHandler;
};

const routes: RouteDefinition[] = [
  // Payroll data
  {
    method: "post",
    path: "/getIdrxRateFromUSDC",
    action: getIdrxRateFromUSDC,
  },
  {
    method: "post",
    path: "/getAllRatesToUsdc",
    action: getAllRatesToUsdc,
  },
];

routes.forEach((route) => {
  router[route.method](route.path, route.action);
});

export default router;
