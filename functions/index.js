// Run npm run lint -- --fix
// Run firebase deploy --only functions
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.updateUserEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const {uid, newEmail, newPassword} = request.data;

  if (!uid || !newEmail) {
    throw new HttpsError("invalid-argument", "Missing uid or newEmail.");
  }

  // Allow users to change their own email
  const isSelf = request.auth.uid === uid;

  // Check Firestore for admin role (role === 0)
  let isAdmin = false;
  if (!isSelf) {
    const db = getFirestore();
    const callerDoc = await db.collection("users").doc(request.auth.uid).get();

    if (callerDoc.exists && callerDoc.data().role === 0) {
      isAdmin = true;
    }
  }

  if (!isSelf && !isAdmin) {
    throw new HttpsError(
        "permission-denied",
        "Only admins can change another user's email.",
    );
  }

  const updates = {
    email: newEmail,
    emailVerified: false,
    multiFactor: {
      enrolledFactors: [],
    },
  };

  // Only include password if one was provided
  if (newPassword && newPassword.trim().length > 0) {
    updates.password = newPassword.trim();
  }

  // Update the email
  try {
    await getAuth().updateUser(uid, updates);
    return {success: true};
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});
