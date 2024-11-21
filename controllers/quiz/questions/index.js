const questions = require("../../../models/quiz/questions");

exports.addNewQuestion = async(req, res)=>{
    const {title, type,category,options, answer} = req.body;
    if(!title ||!type ||!options ||!answer){
        return res.status(400).json({msg: "Please provide all required fields"})
    }
    try {
        const newQuestion = new questions({title, type,category, options, answer, createdBy: req.admin.id, updatedBy: req.admin.id})
        await newQuestion.save()
        return res.status(201).json({msg: "Question created successfully", question : newQuestion})
    } catch (error) {
        console.error(error)
        return res.status(500).json({msg: "Server Error"})
    }
}

exports.getAllAdminquestions = async(req, res)=>{
    try {
        const {filter} = req.body;
        if(!filter){
            const Allquestions = await questions.find({createdBy: req.admin.id, isActive: true}).sort({createdAt: -1})
            return res.status(200).json({msg: "All questions fetched successfully", Allquestions})
        }
        const Allquestions = await questions.find({createdBy: req.admin.id, type: filter, isActive: true}).sort({createdAt: -1})
        return res.status(200).json({msg: "Filtered questions fetched successfully", Allquestions})
       
    } catch (error) {
        console.error(error)
        return res.status(500).json({msg: "Server Error"})
    }
}
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
        typeTitle: question.typeTitle,
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
  

exports.getAdminQuestionById = async(req, res)=>{
    const {questionId} = req.params;

    if(!questionId){
        return res.status(400).json({msg: "Please provide a valid question ID"})
    }
    try {
        const question = await questions.findById(questionId).populate("createdBy", "name")
        if(!question){
            return res.status(404).json({msg: "Question not found"})
        }
        return res.status(200).json({msg: "Question fetched successfully", question})
    } catch (error) {
        console.error(error)
        return res.status(500).json({msg: "Server Error"})
    }
}

exports.updateAdminQuestionById = async(req, res)=>{
    const {questionId} = req.params;
    const {title, type, typeTitle, options, answer} = req.body;
    if(!questionId ||!title ||!type ||!typeTitle ||!options ||!answer){
        return res.status(400).json({msg: "Please provide all required fields"})
    }
    try {
        const findQuestion = await questions.findById({_id :questionId})
        if(!findQuestion){
            return res.status(404).json({msg: "Question not found"})
        }
        const updatedQuestion = {title, type,typeTitle, options, answer}
        const updatedQuestionData = await questions.findByIdAndUpdate(questionId, updatedQuestion, {new: true})
        return res.status(200).json({msg: "Question updated successfully", data : updatedQuestionData})
    } catch (error) {
        console.error(error)
        res.status(500).json({msg : "server error"})
    }
}

exports.deleteQuestionbyAdmin = async(req, res)=>{
    const {questionId} = req.params;
    if(!questionId){
        return res.status(400).json({msg: "Please provide a valid question ID"})
    }
    try {
        const findQuestion = await questions.findByIdAndDelete(questionId)
        if(!findQuestion){
            return res.status(404).json({msg: "Question not found"})
        }
        return res.status(200).json({msg: "Question deleted successfully"})
    } catch (error) {
        console.error(error)
        return res.status(500).json({msg: "Server Error"})
    }
}