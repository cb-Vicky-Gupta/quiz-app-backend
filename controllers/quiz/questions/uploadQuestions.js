const XLSX = require("xlsx");
const questions = require("../../../models/quiz/questions");
const { status } = require("../../../utils/statuscodes");
const { default: mongoose } = require("mongoose");

exports.uploadQuestions = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "Please upload an Excel file" });
        }
        //parse excel file  
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "", // ensures empty cells are returned as ""
        });
        let questionsToInsert = [];
        let errors = [];
        sheetData.forEach((q, index) => {
            const rowNumber = index + 2; // +2 because Excel rows start at 2 (row 1 = header)

            // Required fields
            if (!q.title || !q.type || !q.options || !q.answer) {
                errors.push({
                    row: rowNumber,
                    msg: `Missing required fields (title, type, options, answer)`,
                });
                return; // skip this row
            }
            console.log(q.quizId)
            if (!mongoose.Types.ObjectId.isValid(q.quizId)) {
                errors.push({ row: rowNumber, msg: "Invalid quizId" });
                return;
            }
            // Prepare question object
            questionsToInsert.push({
                title: q.title,
                type: q.type,
                category: q.category || "General",
                options: typeof q.options === "string" ? q.options.split(",") : [],
                answer: q.answer,
                quizId: q.quizId,
                QuestionFor: q.QuestionFor || "paid",
                createdBy: req.admin.id,
                updatedBy: req.admin.id,
                createdDate: new Date(),
                updatedDate: new Date(),
            });
        });

        // Insert valid questions
        if (questionsToInsert.length > 0) {
            await questions.insertMany(questionsToInsert);
        }

        return res.status(status.created).json({
            msg: "Upload completed",
            insertedCount: questionsToInsert.length,
            errors,
            status: true
        });

    } catch (error) {
        console.error(error);
        return res.status(status.serverError).json({ msg: "Server Error", status: false });
    }
}