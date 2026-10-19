
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "init", "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

async function startServer() {
    const dbUrl = process.env.ATLASDB_URL;
    const sessionSecret = process.env.SECRET;
    const mapToken = process.env.MAP_TOKEN;

    if (!dbUrl) {
        throw new Error("ATLASDB_URL is missing");
    }

    if (!sessionSecret) {
        throw new Error("SECRET is missing");
    }

    if (!mapToken) {
        console.warn("WARNING: MAP_TOKEN is missing");
    }

    await mongoose.connect(dbUrl);
    console.log("Connected to MongoDB successfully");

    const store = MongoStore.create({
        mongoUrl: dbUrl,
        crypto: {
            secret: sessionSecret
        },
        touchAfter: 24 * 3600
    });

    store.on("error", (err) => {
        console.error("MongoDB session store error:", err.message);
    });

    app.use(session({
        store,
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        }
    }));

    app.use(flash());

    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    app.use((req, res, next) => {
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.currUser = req.user;
        res.locals.mapToken = mapToken;
        next();
    });

   app.get("/", (req, res) => {
    res.redirect("/listings");
});

    // Do not expose demo account creation in production.
    if (process.env.NODE_ENV !== "production") {
        app.get("/demouser", async (req, res, next) => {
            try {
                const fakeUser = new User({
                    email: "student@gmail.com",
                    username: "delta-student"
                });

                const registeredUser = await User.register(
                    fakeUser,
                    "helloworld"
                );

                res.send(registeredUser);
            } catch (err) {
                next(err);
            }
        });
    }

    app.use("/listings", listingRouter);
    app.use("/listings/:id/reviews", reviewsRouter);
    app.use("/", userRouter);

    app.use((req, res, next) => {
        next(new ExpressError(404, "Page not found"));
    });

    app.use((err, req, res, next) => {
        const {
            statusCode = 500,
            message = "Something went wrong"
        } = err;

        res.status(statusCode).render("error.ejs", {
            message,
            err
        });
    });

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
        console.log(`STAYO server is listening on port ${PORT}`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start STAYO:", err.message);
    process.exitCode = 1;
});
