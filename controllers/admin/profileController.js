const Admin = require("../../models/auth/admin");

/**
 * Get current admin's profile
 * GET /v1/admin/profile
 */
exports.getProfile = async (req, res) => {
    try {
        const admin = req.admin;

        if (!admin) {
            return res.status(404).json({ msg: "Admin not found" });
        }

        const profileData = {
            id: admin._id,
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            role: admin.role,
            isActive: admin.isActive,
            lastLogin: admin.lastLogin,
            quizes: admin.quizes,
            instructorDetail: admin.instructorDetail
        };

        return res.status(200).json({
            msg: "Profile fetched successfully",
            data: profileData
        });
    } catch (error) {
        console.error("Error fetching admin profile:", error);
        return res.status(500).json({ msg: "Server Error" });
    }
};

/**
 * Update current admin's profile
 * PUT /v1/admin/update-profile
 */
exports.updateProfile = async (req, res) => {
    try {
        const adminId = req.admin._id;
        const { firstName, lastName, instructorDetail } = req.body;

        // Validate at least one field is provided
        if (!firstName && !lastName && !instructorDetail) {
            return res.status(400).json({
                msg: "Please provide at least one field to update (firstName, lastName, or instructorDetail)"
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (instructorDetail) updateData.instructorDetail = instructorDetail;
        updateData.updatedBy = adminId;

        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedAdmin) {
            return res.status(404).json({ msg: "Admin not found" });
        }

        const profileData = {
            id: updatedAdmin._id,
            firstName: updatedAdmin.firstName,
            lastName: updatedAdmin.lastName,
            email: updatedAdmin.email,
            role: updatedAdmin.role,
            isActive: updatedAdmin.isActive,
            lastLogin: updatedAdmin.lastLogin,
            quizes: updatedAdmin.quizes,
            instructorDetail: updatedAdmin.instructorDetail
        };

        return res.status(200).json({
            msg: "Profile updated successfully",
            data: profileData
        });
    } catch (error) {
        console.error("Error updating admin profile:", error);
        return res.status(500).json({ msg: "Server Error" });
    }
};
