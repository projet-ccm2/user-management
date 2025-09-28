import "dotenv/config";
import cors from "cors";
import express from "express";
import passport from "passport";
import { configurePassport } from "./config/passport";
import authRoutes from "./routes/authRoute";

const app = express();
const allowedOrigins = [
    "https://frontend-service-782869810736.europe-west1.run.app",
];

configurePassport();

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
    }),
);
app.use(express.json());
app.use(passport.initialize());
app.use("/auth", authRoutes);
app.disable("x-powered-by");

if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT);
}

export default app;
