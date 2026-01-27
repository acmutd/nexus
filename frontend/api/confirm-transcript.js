const admin = require("firebase-admin");
require("./config/firebaseAdmin.js");



// response helpers
const fail = (res, code, error, extra = {}) =>
    res.status(code).json({success: false, error, ...extra});
const ok = (res, payload) => res.status(200).json({success: true, ...payload});

async function verifyUserOrFail(req, res) {
    const {id, token} = req.body;

    if (!id || !token) {
        return {ok: false, res: fail(res, 400, "Missing required fields: id or token")};
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);

        if (decoded.uid !== id) {
                    return {ok: false, res: fail(res, 403, "Token does not match user ID")};
        }

        return {ok: true, uid: decoded.uid};
    } catch (e) {
        return {ok: false, res: fail(res, 403, "Invalid or expired authentication token")};
    }
}

module.exports = async (req, res) => {
    try {
        if (req.method !== "POST") {
            return fail(res, 405, "Method not allowed");
        }

        const {id, courses, meta} = req.body;
        const auth = await verifyUserOrFail(req, res);
        if (!auth.ok) return;

        if (!Array.isArray(courses)) {
            return fail(res, 400, "Missing required fields: courses");
        }

        try {
            const userRef = admin.firestore().collection("users").doc(id);

            const payload = {
                lastTranscriptUpload: new Date().toISOString(),
                courses,
            };

            if (meta && typeof meta === "object" && meta.netId) {
                payload.netId = meta.netId;
            }

            await userRef.set(payload, {merge: true});        } catch (e) {
            console.error("Error saving to Firestore:", e);
            return fail(res, 500, "Failed to save transcript data");
        }

        return ok(res, {message: "Transcript saved"});
    } catch (e) {
        console.error("Error in /api/confirm-transcript:", e);
        return fail(res, 500, "Internal server error");
    }
};
