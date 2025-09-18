// controllers/reportController.js
const PDFDocument = require("pdfkit");
const axios = require("axios");
const QuizAttempt = require("../../models/test/attemptQuestion"); // adjust path
const path = require("path");
// Helper: pretty date
function formatDate(date) {
    if (!date) return "N/A";
    try {
        return new Date(date).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    } catch (err) {
        return new Date(date).toString();
    }
}

exports.downloadReportPdf = async (req, res) => {
    try {
        const attemptId = req.params.attemptId;
        if (!attemptId) return res.status(400).json({ msg: "Missing attemptId" });

        // populate user & quiz — expecting attempt.userId and attempt.quizId are refs
        const attempt = await QuizAttempt.findById(attemptId)
            .populate("userId", "name email employeeId") // select fields you need
            .populate("quizId", "title organization passingMarks totalQuestions totalMarks")
            .lean();

        if (!attempt) return res.status(404).json({ msg: "Attempt not found" });

        const user = attempt.userId || {};
        const quiz = attempt.quizId || {};
        const orgName = "cbQuiz";
        const logoUrl = process.env.LOGO_URL;

        // Prepare response headers for download
        const filename = `test-report-${attemptId}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        // Create PDF document and pipe to response
        const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
        doc.pipe(res);

        // Try to fetch organization logo (optional)
        let logoBuffer = null;
        if (logoUrl) {
            try {
                const imgResp = await axios.get(logoUrl, { responseType: "arraybuffer", timeout: 5000 });
                logoBuffer = Buffer.from(imgResp.data, "binary");
            } catch (err) {
                console.warn("Logo fetch failed:", err.message || err);
                logoBuffer = null;
            }
        }

        // Header: logo + org name
        const headerY = 36;
        if (logoBuffer) {
            try {
                doc.image(logoBuffer, 48, headerY, { width: 70 });
            } catch (e) {
                // ignore if image drawing fails
            }
        }
        doc
            .font("Helvetica-Bold")
            .fontSize(20)
            .fillColor("#0B1226")
            .text(orgName, logoBuffer ? 130 : 48, headerY + (logoBuffer ? 10 : 0), {
                align: "left",
            });

        // Subtitle / tagline (optional)
        doc
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#6b7280")
            .text("Official Test Report", { align: "right" });

        // line
        doc.moveTo(48, 110).lineTo(547, 110).strokeColor("#e6e6e6").stroke();

        // Title centered
        doc.moveDown(1);
        doc
            .fontSize(16)
            .fillColor("#0B1226")
            .font("Helvetica-Bold")
            .text("Assessment Report", { align: "center" });
        doc.moveDown(0.3);
        doc.fontSize(9).font("Helvetica").fillColor("#6b7280").text(`Generated: ${formatDate(new Date())}`, {
            align: "center",
        });

        doc.moveDown(1);

        // Two-column section: left user info, right test info + score card
        const leftX = 48;
        const midX = 320;
        let y = doc.y + 8;

        // Left column: Candidate details
        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor("#374151")
            .text("Candidate:", leftX, y);
        doc.font("Helvetica").fontSize(10).fillColor("#111827")
            .text(user.name || "N/A", leftX + 72, y);

        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151")
            .text("Email:", leftX, y + 16);
        doc.font("Helvetica").fontSize(10).fillColor("#111827")
            .text(user.email || "N/A", leftX + 72, y + 16);

        if (user.employeeId) {
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151")
                .text("Employee ID:", leftX, y + 32);
            doc.font("Helvetica").fontSize(10).fillColor("#111827")
                .text(user.employeeId, leftX + 72, y + 32);
        }

        // Right column: Quiz details + score card
        const quizTop = y;
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text("Test:", midX, quizTop);
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(quiz.title || "N/A", midX + 42, quizTop);

        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text("Started At:", midX, quizTop + 16);
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(formatDate(attempt.startedAt), midX + 72, quizTop + 16);

        doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text("Completed At:", midX, quizTop + 32);
        doc.font("Helvetica").fontSize(10).fillColor("#111827").text(formatDate(attempt.completedAt), midX + 72, quizTop + 32);

        // Score card box
        const scoreBoxX = midX;
        const scoreBoxY = quizTop + 60;
        const boxWidth = 190;
        const boxHeight = 74;
        doc.roundedRect(scoreBoxX, scoreBoxY, boxWidth, boxHeight, 6).fillOpacity(0.06).fillAndStroke("#0B1226", "#e6e6e6");
        doc.fillOpacity(1);

        // Calculate percentage
        let percentage = null;
        if (typeof attempt.percentage === "number") {
            percentage = attempt.percentage;
        } else if (attempt.totalMarks && typeof attempt.score === "number") {
            percentage = (attempt.score / attempt.totalMarks) * 100;
        } else if (attempt.totalQuestions && typeof attempt.score === "number") {
            // if score is number of correct answers
            percentage = (attempt.score / attempt.totalQuestions) * 100;
        } else {
            // if attempt.score is already percent
            percentage = typeof attempt.score === "number" ? attempt.score : null;
        }
        percentage = typeof percentage === "number" ? Math.round(percentage * 10) / 10 : null;

        // Big percentage
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#0B1226").text(percentage !== null ? `${percentage}%` : "N/A", scoreBoxX + 12, scoreBoxY + 14);

        // small text and pass/fail
        const passThreshold = (quiz.passingMarks != null) ? quiz.passingMarks : 40; // fallback 40%
        const passed = percentage !== null ? percentage >= passThreshold : attempt.passed || false;
        doc.font("Helvetica").fontSize(10).fillColor("#374151").text(passed ? "Status: Passed" : "Status: Not Passed", scoreBoxX + 12, scoreBoxY + 46);

        // Stats row under columns
        doc.moveDown(6);
        const statsY = Math.max(scoreBoxY + boxHeight + 14, leftX + 180);
        let statX = leftX;
        const statGap = 120;
        const stats = [
            { label: "Total Questions", value: attempt.totalQuestions || (attempt.answers ? attempt.answers.length : "N/A") },
            { label: "Attempted", value: attempt.attemptedQuestions ?? (attempt.answers ? attempt.answers.filter(a => a.selectedOption != null).length : "N/A") },
            { label: "Correct", value: attempt.correctAnswers ?? (attempt.answers ? attempt.answers.filter(a => a.isCorrect).length : "N/A") },
            { label: "Wrong", value: attempt.wrongAnswers ?? (attempt.answers ? attempt.answers.filter(a => !a.isCorrect).length : "N/A") },
            { label: "Time Taken", value: attempt.duration ? `${Math.round(attempt.duration / 60)} min` : (attempt.completedAt && attempt.startedAt ? Math.round((new Date(attempt.completedAt) - new Date(attempt.startedAt)) / 60000) + " min" : "N/A") },
        ];

        let statsCurrentY = scoreBoxY + boxHeight + 18;
        stats.forEach((s, idx) => {
            const x = leftX + (idx % 3) * statGap + Math.floor(idx / 3) * 0; // simple layout, wrap after 3
            const yPos = statsCurrentY + Math.floor(idx / 3) * 36;
            doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text(s.label, x, yPos);
            doc.font("Helvetica").fontSize(12).fillColor("#111827").text(String(s.value), x, yPos + 14);
        });

        // Draw a progress bar for percentage
        if (percentage !== null) {
            const barX = leftX;
            const barY = statsCurrentY + 90;
            const barW = 480;
            const barH = 12;
            doc.roundedRect(barX, barY, barW, barH, 6).fillOpacity(0.12).fill("#e6e6e6").fillOpacity(1);
            const fillW = Math.max(0, Math.min(barW, (percentage / 100) * barW));
            doc.roundedRect(barX, barY, fillW, barH, 6).fill("#0f766e");
            doc.font("Helvetica").fontSize(9).fillColor("#374151").text(`Score Progress: ${percentage}%`, barX + barW + 8, barY - 2);
        }

        // Section: Top wrong answers (if answers array exists)
        doc.moveDown(4);
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#0B1226").text("Top Incorrect Answers", leftX, doc.y + 8);
        doc.moveDown(0.3);

        const wrongAnswers = Array.isArray(attempt.answers) ? attempt.answers.filter(a => !a.isCorrect) : [];
        const topWrong = wrongAnswers.slice(0, 8);

        if (topWrong.length === 0) {
            doc.font("Helvetica").fontSize(10).fillColor("#6b7280").text("No incorrect answers to show.", leftX, doc.y + 8);
        } else {
            // Table headings
            const tableTopY = doc.y + 8;
            const colQ = leftX;
            const colUser = 320;
            const colCorrect = 450;

            doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Question", colQ, tableTopY);
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Your Answer", colUser, tableTopY);
            doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151").text("Correct Answer", colCorrect, tableTopY);

            let rowY = tableTopY + 14;
            topWrong.forEach((wa, idx) => {
                if (rowY > 720) {
                    doc.addPage();
                    rowY = 48;
                }
                const qText = (wa.questionText || wa.question || `Q ${idx + 1}`).toString().slice(0, 80) + ((wa.questionText && wa.questionText.length > 80) ? "..." : "");
                const yourA = (wa.selectedOptionText || wa.selectedOption || wa.userAnswer || "N/A").toString().slice(0, 40) + ((wa.selectedOptionText && wa.selectedOptionText.length > 40) ? "..." : "");
                const corrA = (wa.correctOptionText || wa.correctOption || wa.correctAnswer || "N/A").toString().slice(0, 40) + ((wa.correctOptionText && wa.correctOptionText.length > 40) ? "..." : "");

                doc.font("Helvetica").fontSize(9).fillColor("#111827").text(qText, colQ, rowY, { width: colUser - colQ - 8 });
                doc.font("Helvetica").fontSize(9).fillColor("#111827").text(yourA, colUser, rowY, { width: colCorrect - colUser - 8 });
                doc.font("Helvetica").fontSize(9).fillColor("#111827").text(corrA, colCorrect, rowY, { width: 100 });
                rowY += 28;
            });
        }

        // Footer
        const footerY = 780;
        doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(`Generated on ${formatDate(new Date())}`, leftX, footerY, { align: "left" });
        doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text("For any queries contact support@your-org.com", leftX, footerY + 12, { align: "left" });

        // finalize PDF and end stream
        doc.end();
    } catch (err) {
        console.error("PDF generation error:", err);
        // if streaming has not started
        if (!res.headersSent) {
            return res.status(500).json({ msg: "Error generating PDF" });
        } else {
            // If headers already sent, just end response
            try { res.end(); } catch (e) { }
        }
    }
};


exports.generateReportCard = async (req, res) => {
    try {
        const logoPath = path.join(__dirname, "../../asset/logo.png"); // replace with your uploaded logo path

        // Example dynamic data (fetch from DB in real app)
        const candidate = {
            name: "Vicky Kumar Gupta",
            email: "vicky-user@gmail.com",
        };
        const test = {
            name: "Electrical Basic Test",
            startedAt: "17 Sept 2025, 11:03 pm",
            completedAt: "17 Sept 2025, 11:05 pm",
        };
        const stats = {
            totalQuestions: 10,
            attempted: 9,
            correct: 3,
            wrong: 6,
            timeTaken: "1 min",
            score: 9, // %
            status: "Not Passed",
        };

        const remarks =
            stats.score >= 80
                ? "Excellent"
                : stats.score >= 50
                    ? "Good"
                    : "Needs Improvement";

        // Start PDF
        const doc = new PDFDocument({ margin: 40 });
        let buffers = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res
                .writeHead(200, {
                    "Content-Length": Buffer.byteLength(pdfData),
                    "Content-Type": "application/pdf",
                    "Content-Disposition": "attachment;filename=report.pdf",
                })
                .end(pdfData);
        });

        // Header with logo + title
        doc.image(logoPath, 40, 20, { width: 60 });
        doc.fontSize(20).fillColor("#1a73e8").text("cbQuiz - Assessment Report", 120, 30);
        doc.moveDown();

        // Candidate Info
        doc.fillColor("#000").fontSize(12).text(`Candidate: ${candidate.name}`);
        doc.text(`Email: ${candidate.email}`);
        doc.moveDown();

        // Test Info
        doc.fontSize(12).fillColor("#444").text(`Test: ${test.name}`);
        doc.text(`Started At: ${test.startedAt}`);
        doc.text(`Completed At: ${test.completedAt}`);
        doc.moveDown();

        // Score Section
        doc.fontSize(30).fillColor(stats.score >= 50 ? "green" : "red").text(`${stats.score}%`, { align: "center" });
        doc.fontSize(14).fillColor("#000").text(`Status: ${stats.status}`, { align: "center" });
        doc.moveDown(2);

        // Table-like Stats
        doc.fontSize(12).fillColor("#333");
        doc.text(`Total Questions: ${stats.totalQuestions}`);
        doc.text(`Attempted: ${stats.attempted}`);
        doc.text(`Correct: ${stats.correct}`);
        doc.text(`Wrong: ${stats.wrong}`);
        doc.text(`Time Taken: ${stats.timeTaken}`);
        doc.moveDown();

        // Remarks Section
        doc.fontSize(14).fillColor("#1a73e8").text("Remarks:", { underline: true });
        doc.fillColor("#000").fontSize(12).text(remarks);
        doc.moveDown(2);

        // Footer
        doc.fillColor("#888").fontSize(10).text("Powered by cbQuiz", 40, 750, { align: "center" });

        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Failed to generate report" });
    }
};