const express = require("express")
const { downloadReportPdf, generateReportCard } = require("../../controllers/common/report");
const router = express.Router()

router.post("/report/:attemptId/pdf", downloadReportPdf);
router.post("/report2/:attemptId/pdf", generateReportCard);

module.exports = router;
