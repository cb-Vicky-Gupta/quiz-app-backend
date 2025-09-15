const questions = require("../../../models/quiz/questions");

exports.addNewQuestion = async (req, res) => {
    const { title, type, category, options, answer, quizId, QuestionFor } = req.body;
    if (!title || !type || !options || !answer) {
        return res.status(400).json({ msg: "Please provide all required fields" })
    }
    try {
        const newQuestion = new questions({ title, type, category, options, answer, quizId, QuestionFor, createdBy: req.admin.id, updatedBy: req.admin.id })
        await newQuestion.save()
        return res.status(201).json({ msg: "Question created successfully", question: newQuestion, status: true })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: "Server Error" })
    }
}

exports.getAllAdminquestions = async (req, res) => {
    try {
        let { page = 1, limit = 10, filter, search } = req.body;

        page = parseInt(page);
        limit = parseInt(limit);

        // Build query object
        const query = { createdBy: req.admin.id, isActive: true };

        // Filter by type if provided
        if (filter) {
            query.type = filter;
        }

        // Search in title (you can also add category, options etc.)
        if (search) {
            query.title = { $regex: search, $options: "i" };
        }

        // Get total count for pagination
        const total = await questions.countDocuments(query);

        // Fetch paginated questions
        const Allquestions = await questions
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({
            msg: "Questions fetched successfully",
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            Allquestions,
            status: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Server Error" });
    }
};

exports.transformData = async (req, res) => {
    try {
        // Fetch all questions for the admin
        const allQuestions = await questions.find({ createdBy: req.admin.id });

        // Function to clean up and convert a string to a proper array
        const cleanArrayField = (field) => {
            // Remove brackets and extra quotes, then split by comma
            if (typeof field === 'string') {
                return field
                    .replace(/[\[\]']+/g, '') // Remove brackets and quotes
                    .split(',')
                    .map(item => item.trim()); // Trim whitespace from each item
            }
            // If it's already an array, clean each item
            if (Array.isArray(field)) {
                return field.map(item => item.replace(/[\[\]']+/g, '').trim());
            }
            return field; // Return as-is if neither string nor array
        };

        // Iterate over each question and clean up options and answers
        for (const question of allQuestions) {
            const cleanedOptions = cleanArrayField(question.options);
            const cleanedAnswer = cleanArrayField(question.answer);

            // Update the database with cleaned data
            await questions.updateOne(
                { _id: question._id },
                {
                    $set: {
                        options: cleanedOptions,
                        answer: cleanedAnswer,
                    },
                }
            );
        }

        // Fetch the cleaned and transformed data for the response
        const transformedData = allQuestions.map((question) => ({
            id: question._id,
            title: question.title,
            type: question.type,
            category: question.category,
            categoryTitle: question.categoryTitle,
            options: cleanArrayField(question.options),
            answer: cleanArrayField(question.answer),
            createdBy: req.admin.id,
        }));

        // Send the transformed data as a response
        res.json(transformedData);

    } catch (error) {
        console.error('Error transforming data:', error);
        res.status(500).json({ error: 'Failed to transform data' });
    }
};


exports.getAdminQuestionById = async (req, res) => {
    const { questionId } = req.params;

    if (!questionId) {
        return res.status(400).json({ msg: "Please provide a valid question ID" })
    }
    try {
        const question = await questions.findById(questionId).populate("createdBy", "name")
        if (!question) {
            return res.status(404).json({ msg: "Question not found" })
        }
        return res.status(200).json({ msg: "Question fetched successfully", data: question, status: true })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: "Server Error" })
    }
}

exports.updateAdminQuestionById = async (req, res) => {
    const { questionId } = req.params;
    const { title, type, options, answer } = req.body;
    if (!questionId || !title || !type || !options || !answer) {

        return res.status(400).json({ msg: "Please provide all required fields" })
    }
    try {
        const findQuestion = await questions.findById({ _id: questionId })
        if (!findQuestion) {
            return res.status(404).json({ msg: "Question not found" })
        }
        const updatedQuestion = { title, type, options, answer }
        const updatedQuestionData = await questions.findByIdAndUpdate(questionId, updatedQuestion, { new: true })
        return res.status(200).json({ msg: "Question updated successfully", data: updatedQuestionData, status: true })
    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "server error" })
    }
}

exports.deleteQuestionbyAdmin = async (req, res) => {
    const { questionId } = req.params;
    if (!questionId) {
        return res.status(400).json({ msg: "Please provide a valid question ID" })
    }
    try {
        const findQuestion = await questions.findByIdAndDelete(questionId)
        if (!findQuestion) {
            return res.status(404).json({ msg: "Question not found" })
        }
        return res.status(200).json({ msg: "Question deleted successfully", status: true })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ msg: "Server Error" })
    }
}