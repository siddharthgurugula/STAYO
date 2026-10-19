const Listing=require("../models/listing");
const Review=require("../models/review");

module.exports.createReview=async (req, res) => {

        let { id } = req.params;

        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        const newReview = new Review(req.body.review);
        newReview.author = req.user._id;
        listing.reviews.push(newReview);

        await newReview.save();
        await listing.save();

        req.flash("success", "New Review Created!");

        return res.redirect(`/listings/${id}`);
};

module.exports.destroyReview=async (req, res) => {

        let { id, reviewId } = req.params;

        const review = await Review.findById(reviewId);

        if (!review) {
            req.flash("error", "Review does not exist!");
            return res.redirect(`/listings/${id}`);
        }

        if (!review.author || !review.author.equals(req.user._id)) {
            req.flash("error", "You don't have permission to delete this review!");
            return res.redirect(`/listings/${id}`);
        }

        await Listing.findByIdAndUpdate(id, {
            $pull: {
                reviews: reviewId
            }
        });

        await Review.findByIdAndDelete(reviewId);

        req.flash("success", "Review deleted!");

        return res.redirect(`/listings/${id}`);
};