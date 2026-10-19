
const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/tilesets");

const mapToken = process.env.MAP_TOKEN;
const baseClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    const search = (req.query.search || "").trim();

    let filter = {};

    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const searchRegex = new RegExp(escapedSearch, "i");

        filter = {
            $or: [
                { title: searchRegex },
                { location: searchRegex },
                { country: searchRegex }
            ]
        };
    }

    const allListings = await Listing.find(filter);

    res.render("listings/index", {
        allListings,
        search
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", {
        listing
    });
};

module.exports.createListing = async (req, res) => {
    const newListing = new Listing(req.body.listing);

    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    newListing.owner = req.user._id;

    await newListing.save();

    req.flash("success", "New Listing Created!");

    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/edit.ejs", {
        listing
    });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    await Listing.findByIdAndUpdate(id, {
        ...req.body.listing
    });

    req.flash("success", "Listing updated!");

    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    await Listing.findByIdAndDelete(id);

    req.flash("success", "Listing deleted!");

    res.redirect("/listings");
};
