import mongoose from "mongoose";
import app from "./app.js";
import config from "./config/index.js";

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

// Connect to MongoDB
const connectDb = async () => {
  try {
    await mongoose.set("strictQuery", false);
    await mongoose.connect(config.db_url);
    console.log("DB Connected");
    app.listen(config.port, () => {
      console.log(`Server is running at http://localhost:${config.port}`);
    });
  } catch (error) {
    console.log("Error connecting to the database:", error);
    process.exit(1); // Exit the process if unable to connect to the database
  }
  
  process.on("unhandledRejection", (err) => {
    console.log(
      "Unhandled rejection detected, closing the server..."
    );
    if (server) {
      server.close(() => {
        console.log(err);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
};

connectDb();

process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  if (server) {
    server.close();
  }
});
