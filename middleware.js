const Listing = require("./models/listing");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {

    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;

        req.flash("error", "You must be logged in!");

        return res.redirect("/login");
    }

    next();
};


module.exports.saveRedirectUrl = (req, res, next) => {

    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
};


module.exports.isOwner = async (req, res, next) => {

    let { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    if (!listing.owner || !listing.owner.equals(req.user._id)) {
        req.flash("error", "You are not the owner of this listing!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};


module.exports.validateListing = (req, res, next) => {

    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details
            .map((el) => el.message)
            .join(",");

        throw new ExpressError(400, errMsg);
    }

    next();
};


module.exports.validateReview = (req, res, next) => {

    let { error } = reviewSchema.validate(req.body);

    if (error) {
        let errMsg = error.details
            .map((el) => el.message)
            .join(",");

        throw new ExpressError(400, errMsg);
    }

    next();
};

module.exports.isReviewAuthor = async (req, res, next) => {

    let { id,reviewid } = req.params;

    const review = await Review.findById(reviewid);

    if (!review) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    if (!review.author || !Review.author.equals(req.user._id)) {
        req.flash("error", "You are not the author of this listing!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};