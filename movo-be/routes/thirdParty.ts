import express, { RequestHandler } from "express";
import {
  getResponseFromGemini,
} from "../controllers/thirdPartyController";

const router = express.Router();

type RouteMethod = "get" | "post" | "put" | "delete";

type RouteDefinition = {
  method: RouteMethod;
  path: string;
  action: RequestHandler;
};

const routes: RouteDefinition[] = [
  {
    method: "post",
    path: "/getResponseFromGemini",
    action: getResponseFromGemini,
  },
];

routes.forEach((route) => {
  router[route.method](route.path, route.action);
});

export default router;
