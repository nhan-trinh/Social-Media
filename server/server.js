import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";
import userRouter from "./routes/userRoutes.js";
import postRouter from "./routes/postRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import shareRouter from "./routes/shareRoutes.js";

const app = express();

await connectDB();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// Static cache headers for client build (if served here in prod)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, "../client/dist");
app.use(
  express.static(clientDist, {
    maxAge: "365d",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (/\.(html)$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.get("/", (req, res) => res.send("Server is running"));
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/user", userRouter);
app.use("/api/post", postRouter);
app.use("/api/story", storyRouter);
app.use("/api/message", messageRouter);
app.use("/api/comment", commentRouter )
app.use("/api/share", shareRouter)

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
