const questionTypes = require("../../../models/quiz/questionTypes");
const Question = require('../../../models/quiz/questions');

exports.typeController = async (req, res) => {
  const { title } = req.body;
  try {
    if (!title) {
      return res.status(400).json({ msg: "Please provide a type of question" })
    }
    const findDuplicate = await questionTypes.findOne({ title, createdBy: req.admin.id })
    if (findDuplicate) {
      if (findDuplicate.isActive) {
        return res.status(409).json({ msg: "This type of question already exists." })
      } else {
        findDuplicate.isActive = true;
        findDuplicate.updatedBy = req.admin.id;
        await findDuplicate.save();
        return res.status(200).json({ msg: "Question type added successfully!", type: findDuplicate });
      }
    }
    const newType = new questionTypes({ title, createdBy: req.admin.id, updatedBy: req.admin.id })
    await newType.save()
    return res.status(200).json({ msg: "Question type added successfully" })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ msg: "Server Error" })
  }
}


exports.getAdminQuestionType = async (req, res) => {
  const { isActive } = req.body;
  let findTypes;

  try {
    // Fetch all question types based on the `isActive` status
    if (!isActive) {
      findTypes = await questionTypes.find({ createdBy: req.admin.id, isActive: true });
    } else if (isActive === "not-active") {
      findTypes = await questionTypes.find({ createdBy: req.admin.id, isActive: false });
    }

    // If no question types found, return 404
    if (!findTypes || findTypes.length === 0) {
      return res.status(404).json({ msg: "Question types not found" });
    }
    // Use Promise.all to count questions for each question type
    const responseData = await Promise.all(
      findTypes.map(async (type) => {
        // Count the number of questions for the current type
        const noOfQue = await Question.countDocuments({ type: type.title, createdBy: req.admin.id });
        // Return the question type data along with `noOfQue`
        return {
          ...type.toObject(), // Convert Mongoose document to a plain object
          noOfQue,            // Add the count of questions
        };
      })
    );

    return res.status(200).json({ msg: "Question types fetched successfully", data: responseData });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: "Server Error", error });
  }
};


exports.deleteTypeContoller = async (req, res) => {
  const { typeId } = req.params;
  const findTypeAndDelete = await questionTypes.findOne({ _id: typeId, createdBy: req.admin.id })

  if (!findTypeAndDelete) {
    return res.status(404).json({ msg: "Question type not found" })
  }
  try {
    const updatedType = {
      title: findTypeAndDelete.title,
      createdBy: findTypeAndDelete.createdBy,
      updatedBy: req.admin.id,
      isActive: false,
    }
    await findTypeAndDelete.updateOne(updatedType)
    return res.status(200).json({ msg: "Question type deleted successfully" })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ msg: "Server Error" })
  }
}