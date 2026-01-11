const User = require("../../models/auth/users");
const { status } = require("../../utils/statuscodes");

/**
 * Get current user's profile
 * GET /v1/user/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        const profileData = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            purchasedQuiz: user.purchasedQuiz
        };

        return res.status(status.success).json({
            msg: "Profile fetched successfully",
            data: profileData,
            status: status.success
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({ msg: "Server Error" });
    }
};

/**
 * Update current user's profile
 * PUT /v1/user/update-profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { firstName, lastName } = req.body;

        // Validate at least one field is provided
        if (!firstName && !lastName) {
            return res.status(400).json({ 
                msg: "Please provide at least one field to update (firstName or lastName)" 
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        updateData.updatedBy = userId;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ msg: "User not found" });
        }

        const profileData = {
            id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            lastLogin: updatedUser.lastLogin,
            purchasedQuiz: updatedUser.purchasedQuiz
        };

        return res.status(status.success).json({
            msg: "Profile updated successfully",
            data: profileData,
            status: status.success
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ msg: "Server Error" });
    }
};
