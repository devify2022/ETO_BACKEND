import http from "http-status-codes";
import User from "./user.model";
import ApiError from "../../../errors/ApiError"

const createUser = async (payload) => {
  const user = await User.create(payload);
  if (!user) {
    throw new ApiError(http.BAD_REQUEST, "User not created");
  }

  return user;
};

export const UserService = {
  createUser,
};
