import express from "express";
import { UserRoutes } from "../modules/user/user.route"

const routes = express.Router();

const moduleRoutes = [
  {
    path: "/",
    route: UserRoutes,
  },
];

moduleRoutes.forEach((route) => route.use(route.path, route.route));

export default routes;
