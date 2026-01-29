const {db, admin} = require('../config/firebaseAdmin');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({error: 'Missing auth token'});
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const requesterUid = decodedToken.uid;

        const requesterDoc = await db.collection('users').doc(requesterUid).get();

        const SUPER_ADMINS = ['diNawmm3YMTzZojPGTZNdaEosP13'];
        const isSuperAdmin = SUPER_ADMINS.includes(requesterUid);

        if (!isSuperAdmin && (!requesterDoc.exists || !requesterDoc.data().isAdmin)) {
            return res.status(403).json({error: 'Not authorized'});
        }

        if (req.method === 'GET') {
            const snapshot = await db
                .collection('users')
                .orderBy('createdAt', 'desc')
                // .limit(50)  // todo - maybe limit this later? paginate?
                .get();
            const users = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    email: data.email || 'No Email',
                    netId: data.netId || 'N/A',
                    isAdmin: !!data.isAdmin,
                    discord: data.discord ? {
                        id: data.discord.id,
                        username: data.discord.username,
                        globalName: data.discord.globalName,
                        avatarUrl: data.discord.avatarUrl
                    } : null,
                    courses: (data.courses || []).map(c => ({
                        code: c.course_id.split('-').slice(0, 2).join(' '),
                        name: c.course_name
                    })),
                    createdAt: data.createdAt
                });
            });

            return res.json({users});
        }

        if (req.method === 'PUT') {
            const {targetUid, makeAdmin} = req.body;
            if (!targetUid) return res.status(400).json({error: 'Missing targetUid'});

            await db.collection('users').doc(targetUid).update({
                isAdmin: !!makeAdmin
            });

            return res.json({success: true, isAdmin: !!makeAdmin});
        }

        if (req.method === 'DELETE') {
            const {targetUid, action} = req.query;
            if (!targetUid) return res.status(400).json({error: 'Missing targetUid'});

            if (action === 'grades') {
                await db.collection('courseGrades').doc(targetUid).delete();
                return res.json({success: true, message: 'Grades wiped'});
            }

            if (action === 'user') {
                const batch = db.batch();
                batch.delete(db.collection('users').doc(targetUid));
                batch.delete(db.collection('courseGrades').doc(targetUid));
                await batch.commit();
                return res.json({success: true, message: 'User data wiped'});
            }
            // todo - if IAM roles are in place, swap the above conditional for the below
            // if (action === 'user') {
            //     const batch = db.batch();
            //     batch.delete(db.collection('users').doc(targetUid));
            //     batch.delete(db.collection('courseGrades').doc(targetUid));
            //     await batch.commit();
            //
            //     try {
            //         await admin.auth().deleteUser(targetUid);
            //     } catch (e) {
            //         throw e;
            //     }
            //
            //     return res.json({success: true, message: 'User data + auth account deleted'});
            // }
        }

        return res.status(405).json({error: 'Method not allowed'});

    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({error: 'Internal Server Error'});
    }
};
