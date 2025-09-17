exports.adminStudentLeaderboard = async (req, res) => {
    const { adminId } = req.body;
    const leaderboard = await Admin.aggregate([
        {
            $match: {
                isActive: true,
                role: "admin"
            }
        },
        {
            $lookup: {
                from: "students",
                localField: "_id",
                foreignField: "adminId",
                as: "studentData"
            }
        },
        {
            $unwind: "$studentData"
        },
        {
            $group: {
                _id: "$studentData.studentId",
                studentName: { $first: "$studentData.studentName" },
                totalScore: { $sum: "$studentData.score" },
                totalAttempts: { $sum: 1 }
            }
        },
        {
            $sort: { totalScore: -1, totalAttempts: 1 }
        },
        {
            $limit: 10
        }
    ]);
    return res.status(200).json({ msg: "" })
}