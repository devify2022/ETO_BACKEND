import catchAsync from "../../../shared/catchAsync"
import sendResponse from "../../../shared/sendResponse"
import { UserService } from "./user.services";

// Create a new user
const createUser = catchAsync(async (req, res) => {
  const result = await UserService.createUser(req.body);

  sendResponse(res, {
    statusCode: http.OK,
    success: true,
    message: "User created successfully",
    data: result,
  });
});


export const UserController = {
  createUser
}