const {admin} = require("./config/firebaseAdmin.js");
const {PDFParse} = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const PARSE_SEMESTER = "2026 Spring";

const EXCLUDED_ACTIVITY_TYPES = new Set([
    "Laboratory",
    "Laboratory - No Lab Fee",
    "Common Exam",
    "Dissertation",
    "Independent Study",
    "Internship",
    "Master's Thesis",
    "Practicum",
    "Research",
]);

// response helpers
const fail = (res, code, error, extra = {}) =>
    res.status(code).json({success: false, error, ...extra});
const ok = (res, payload) => res.status(200).json({success: true, ...payload});

async function verifyUserOrFail(req, res) {
    const {id, token} = req.body;
    if (!id || !token) return {ok: false, res: fail(res, 400, "Missing required fields: id or token")};

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded.uid !== id) return {ok: false, res: fail(res, 403, "Token does not match user ID")};
        return {ok: true, uid: decoded.uid};
    } catch (e) {
        return {ok: false, res: fail(res, 403, "Invalid or expired authentication token")};
    }
}

async function parsePdfTextOrFail(pdf_content, res) {
    if (!pdf_content) return {ok: false, res: fail(res, 400, "Missing required field: pdf_content")};

    let pdfBuffer;
    try {
        pdfBuffer = Buffer.from(pdf_content, "base64");
    } catch {
        return {ok: false, res: fail(res, 400, "Invalid base64 PDF content")};
    }

    if (pdfBuffer.length > 512 * 1024) {
        return {ok: false, res: fail(res, 400, "PDF file size exceeds 0.5MB limit")};
    }

    let parser;
    try {
        parser = new PDFParse({data: pdfBuffer});
        const pdfData = await parser.getText();
        return {ok: true, text: pdfData.text || ""};
    } catch (e) {
        console.error("PDF parsing error:", e);
        return {ok: false, res: fail(res, 400, "Failed to parse PDF file")};
    } finally {
        if (parser?.destroy) {
            try {
                await parser.destroy();
            } catch {
                // ignore cleanup errors
            }
        }
    }
}

function assertUtdTranscriptOrThrow(text) {
    if (!text.includes("Unofficial Transcript - UT-Dallas")) {
        throw new Error("Invalid transcript: Not a UTD unofficial transcript");
    }
    if (!text.includes("Name:") || !text.includes("Student ID:")) {
        throw new Error("Invalid transcript: Missing student information");
    }
}

// coursebook cache (term -> { byCourseKey, activityByCourseKey })
const coursebookCache = new Map();

function safeReadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// term is "25f", "26s", etc
function loadCoursebookTerm(term) {
    const t = String(term || "").trim().toLowerCase();
    if (!t) return {byCourseKey: new Map(), activityByCourseKey: new Map()};
    if (coursebookCache.has(t)) return coursebookCache.get(t);

    // serverless layout: ./data/classes_25f.json, etc
    const filePath = path.join(__dirname, "data", `classes_${t}.json`);

    if (!fs.existsSync(filePath)) {
        const empty = {byCourseKey: new Map(), activityByCourseKey: new Map()};
        coursebookCache.set(t, empty);
        return empty;
    }

    let rows = [];
    try {
        rows = safeReadJson(filePath);
        if (!Array.isArray(rows)) rows = [];
    } catch (e) {
        console.error(`Failed to parse coursebook file for term=${t}:`, e);
        rows = [];
    }

    const byCourseKey = new Map();
    const activityByCourseKey = new Map();

    for (const r of rows) {
        const rt = String(r.term || "").trim().toLowerCase();
        const prefix = String(r.course_prefix || "").trim().toLowerCase();
        const num = String(r.course_number || "").trim();
        const prof = String(r.instructors || "").trim();
        const activity = String(r.activity_type || "").trim();

        if (!rt || !prefix || !num) continue;
        if (rt !== t) continue;

        const key = `${rt}|${prefix}|${num}`;

        if (prof) {
            if (!byCourseKey.has(key)) byCourseKey.set(key, new Set());
            byCourseKey.get(key).add(prof);
        }
        if (activity) {
            if (!activityByCourseKey.has(key)) activityByCourseKey.set(key, new Set());
            activityByCourseKey.get(key).add(activity);
        }
    }

    const payload = {byCourseKey, activityByCourseKey};
    coursebookCache.set(t, payload);
    return payload;
}

function courseHasAllowedActivity({term, prefix, number}) {
    if (!term || !prefix || !number) return false;

    const {activityByCourseKey} = loadCoursebookTerm(term);
    const key = `${String(term).toLowerCase()}|${String(prefix).toLowerCase()}|${String(number).trim()}`;
    const set = activityByCourseKey.get(key);
    if (!set || set.size === 0) return false;

    // If any activity for the course is in the excluded list, mark disallowed
    const excludedLower = new Set(Array.from(EXCLUDED_ACTIVITY_TYPES).map((s) => String(s).toLowerCase()));
    for (const act of set) {
        const a = String(act || "").trim().toLowerCase();
        if (excludedLower.has(a)) return false;
    }

    return true;
}

// transcript parsing
const Transcript = (() => {
    const normalizeSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();

    function semesterToTermCode(semesterStr) {
        const m = String(semesterStr || "").trim().match(/^(\d{4})\s+(Fall|Spring|Summer)$/i);
        if (!m) return null;
        const yy = m[1].slice(2);
        const sem = m[2].toLowerCase();
        const letter = sem === "fall" ? "f" : sem === "spring" ? "s" : "u";
        return `${yy}${letter}`;
    }

    function compareSemestersDesc(a, b) {
        const [yearA, semA] = a.split(" ");
        const [yearB, semB] = b.split(" ");
        if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
        const semOrder = {Fall: 3, Summer: 2, Spring: 1};
        return semOrder[semB] - semOrder[semA];
    }

    function getNameParts(name) {
        const clean = normalizeSpaces(name);
        if (!clean) return {firstInitial: "", lastLower: ""};
        const parts = clean.split(" ");
        const first = parts[0] || "";
        const last = parts[parts.length - 1] || "";
        return {firstInitial: first ? first[0].toLowerCase() : "", lastLower: last.toLowerCase()};
    }

    function isSamePerson(transcriptName, coursebookName) {
        const a = getNameParts(transcriptName);
        const b = getNameParts(coursebookName);
        if (!a.lastLower || !b.lastLower) return false;
        if (a.lastLower !== b.lastLower) return false;
        if (!a.firstInitial || !b.firstInitial) return true;
        return a.firstInitial === b.firstInitial;
    }

    function splitNames(raw) {
        return String(raw || "")
            .split(/[,&;]/)
            .map((s) => s.trim())
            .filter(Boolean);
    }

    function choosePrimaryInstructor({term, prefix, number, transcriptInstructors}) {
        // no instructors listed at all
        if (!Array.isArray(transcriptInstructors) || transcriptInstructors.length === 0) return null;

        // only one instructor on transcript
        if (transcriptInstructors.length === 1) return normalizeSpaces(transcriptInstructors[0]) || null;

        const t = (term || "").toLowerCase();
        const p = (prefix || "").toLowerCase();
        const n = String(number || "").trim();

        if (!t || !p || !n) {
            return normalizeSpaces(transcriptInstructors[transcriptInstructors.length - 1]) || null;
        }

        const {byCourseKey} = loadCoursebookTerm(t);
        const key = `${t}|${p}|${n}`;
        const profSet = byCourseKey.get(key);

        if (!profSet || profSet.size === 0) {
            return normalizeSpaces(transcriptInstructors[transcriptInstructors.length - 1]) || null;
        }

        const coursebookProfs = [];
        for (const raw of Array.from(profSet)) {
            coursebookProfs.push(...splitNames(raw));
        }

        for (let ti = 0; ti < transcriptInstructors.length; ti++) {
            const cand = transcriptInstructors[ti];
            for (let pi = 0; pi < coursebookProfs.length; pi++) {
                const prof = coursebookProfs[pi];
                if (isSamePerson(cand, prof)) return normalizeSpaces(cand) || null;
            }
        }

        return normalizeSpaces(transcriptInstructors[transcriptInstructors.length - 1]) || null;
    }

    function extractTranscriptData(transcriptText) {
        const transcript_data = {
            student_name: null,
            student_id: null,
            courses: {transfer_credits: [], test_credits: [], utd_classes: {}},
        };

        const nameMatch = transcriptText.match(/Name:\s*(.+)/);
        if (nameMatch) transcript_data.student_name = nameMatch[1].trim();

        const idMatch = transcriptText.match(/Student ID:\s*(\d+)/);
        if (idMatch) transcript_data.student_id = idMatch[1].trim();

        const lines = transcriptText.split("\n");
        let currentSection = null;
        let currentSemester = null;

        const targetSemester = PARSE_SEMESTER || null;
        let collecting = targetSemester ? false : true;
        let parsedTarget = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === "Transfer Credits") {
                currentSection = "transfer_credits";
                continue;
            }
            if (line === "Test Credits") {
                currentSection = "test_credits";
                continue;
            }
            if (line === "Beginning of Undergraduate Record" || line === "Beginning of Graduate Record") {
                currentSection = "utd_classes";
                continue;
            }

            const semMatch = line.match(/^(\d{4})\s+(Fall|Spring|Summer)$/);
            if (semMatch) {
                currentSemester = line;
                if (currentSection === "utd_classes") {
                    if (targetSemester) {
                        if (currentSemester === targetSemester) {
                            transcript_data.courses.utd_classes[currentSemester] = [];
                            collecting = true;
                            parsedTarget = true;
                        } else {
                            collecting = false;
                            if (parsedTarget) break;
                        }
                    } else {
                        transcript_data.courses.utd_classes[currentSemester] = [];
                        collecting = true;
                    }
                }
                continue;
            }

            const courseMatch = line.match(
                /^([A-Z]{2,4})\s+(\d[A-Z\d]{3})(.+?)([\d\.]+)([\d\.]+)(?:([\d\.]+))?$/
            );
            if (!courseMatch || currentSection !== "utd_classes" || !currentSemester) continue;
            if (!collecting) continue;

            const prefix = courseMatch[1];
            const number = courseMatch[2];
            const courseCode = `${prefix} ${number}`;
            const courseName = courseMatch[3].trim();
            const creditsAttempted = parseFloat(courseMatch[4]);
            const creditsEarned = parseFloat(courseMatch[5]);
            const grade = "In Progress";

            // scan next lines for instructors (bounded)
            const instructors = [];
            for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
                const nextLine = lines[j].trim();

                const instructorMatch = nextLine.match(/^Instructor:\s*(.+)$/);
                if (!instructorMatch) {
                    if (nextLine.match(/^[A-Z]{2,4}\s+\d[A-Z\d]{3}/) || nextLine.match(/^\d{4}\s+(Fall|Spring|Summer)/)) break;
                    continue;
                }

                instructors.push(...splitNames(instructorMatch[1]));

                // capture indented/continuation name lines
                for (let k = j + 1; k < Math.min(j + 6, lines.length); k++) {
                    const s = lines[k].trim();
                    if (!s) continue;

                    if (
                        s.match(/^[A-Z]{2,4}\s+\d{4}/) ||
                        s.match(/^[A-Z]{2,4}\s+\d[A-Z\d]{3}/) ||
                        s.match(/^\d{4}\s+(Fall|Spring|Summer)/) ||
                        s.startsWith("Instructor:") ||
                        s.startsWith("Req Designation:") ||
                        s.startsWith("Course Topic:")
                    ) {
                        break;
                    }

                    if (s.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/)) instructors.push(...splitNames(s));
                }
                break;
            }

            const term = semesterToTermCode(currentSemester); // "25f"
            if (!courseHasAllowedActivity({term, prefix, number})) continue;

            const instructor = choosePrimaryInstructor({term, prefix, number, transcriptInstructors: instructors});

            transcript_data.courses.utd_classes[currentSemester].push({
                course_code: courseCode,
                course_name: courseName,
                credits_attempted: creditsAttempted,
                credits_earned: creditsEarned,
                grade,
                instructor: instructor || null,
                transcript_instructors: instructors,
            });
        }

        return transcript_data;
    }

    function extractCurrentSemesterCourses(transcriptData) {
        const utdClasses = transcriptData?.courses?.utd_classes || {};
        const semesters = Object.keys(utdClasses).sort(compareSemestersDesc);
        if (semesters.length === 0) return [];

        const mostRecentSemester = semesters[0];
        const courses = utdClasses[mostRecentSemester] || [];

        return courses.map((course) => {
            const courseCode = course.course_code.replace(" ", "-");

            let instructorSuffix = "";
            if (course.instructor) {
                const parts = normalizeSpaces(course.instructor).split(" ");
                instructorSuffix = `-${parts[parts.length - 1]}`;
            }

            return {
                course_id: `${courseCode}${instructorSuffix}`,
                course_name: course.course_name,
                grade: course.grade,
                credits: course.credits_earned,
            };
        });
    }

    return {extractTranscriptData, extractCurrentSemesterCourses};
})();

// serverless handler
module.exports = async (req, res) => {
    try {
        if (req.method !== "POST") return fail(res, 405, "Method not allowed");

        const {id} = req.body;

        // auth
        const auth = await verifyUserOrFail(req, res);
        if (!auth.ok) return;

        // pdf parse
        const pdf = await parsePdfTextOrFail(req.body.pdf_content, res);
        if (!pdf.ok) return;

        // validate transcript
        try {
            assertUtdTranscriptOrThrow(pdf.text);
        } catch (e) {
            return fail(res, 400, e.message);
        }

        // parse
        const transcriptData = Transcript.extractTranscriptData(pdf.text);
        transcriptData.id = id;

        const currentSemesterCourses = Transcript.extractCurrentSemesterCourses(transcriptData);
        if (currentSemesterCourses.length === 0) {
            return fail(res, 400, "No courses found for the current semester");
        }

        // save immediately
        try {
            const userRef = admin.firestore().collection("users").doc(id);
            await userRef.set(
                {
                    lastTranscriptUpload: new Date().toISOString(),
                    courses: currentSemesterCourses,
                },
                {merge: true}
            );
        } catch (e) {
            console.error("Error saving to Firestore:", e);
            return fail(res, 500, "Failed to save transcript data");
        }

        return ok(res, {
            message: "Transcript parsed successfully",
            transcript_data: transcriptData,
            current_semester_courses: currentSemesterCourses,
        });
    } catch (e) {
        console.error("Error in /api/parse-transcript:", e);
        return fail(res, 500, "Internal server error while processing transcript", {details: e.message});
    }
};
