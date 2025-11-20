import { db } from "..//services/firebase";
import {
doc,
getDoc,
setDoc,
updateDoc,
serverTimestamp,
arrayUnion,
arrayRemove,
} from "firebase/firestore";


export const userRef = (uid: string) => doc(db, "users", uid);


export async function ensureUserProfile(opts: {
uid: string;
email: string;
displayName: string | null;
language?: "es" | "en";
location?: string;
timezone?: string; // IANA
}) {
const { uid, email, displayName, language = "es", location = "Santiago", timezone = "America/Santiago" } = opts;
const ref = userRef(uid);
const snap = await getDoc(ref);
if (!snap.exists()) {
await setDoc(ref, {
uid, email, displayName: displayName ?? "Usuario",
language, location, timezone,
interests: [],
preferences: {
preferredLanguage: language,
travelStyle: "standard",
groupSize: "solo",
transportPreference: ["walking", "public_transport"],
accessibility: { visualAssistance:false, hearingAssistance:false, mobilityAssistance:false },
notifications: { weatherUpdates:true, priceAlerts:true, eventReminders:true, recommendations:true },
budget: null,
},
createdAt: serverTimestamp(),
updatedAt: serverTimestamp(),
});
return;
}
const data = snap.data() || {};
await updateDoc(ref, {
language: data.language ?? language,
location: data.location ?? location,
timezone: typeof data.timezone === "string" && data.timezone.includes("/") ? data.timezone : "America/Santiago",
interests: Array.isArray(data.interests) ? data.interests : [],
preferences: { ...(data.preferences || {}) },
updatedAt: serverTimestamp(),
} as any);
}


export async function removeInterest(uid: string, interest: string) {
  await updateDoc(userRef(uid), {
    interests: arrayRemove(interest),
    updatedAt: serverTimestamp(),
  });
}

// 👉 ESTA ES LA QUE TE FALTA
export async function setInterests(uid: string, interests: string[]) {
  await updateDoc(userRef(uid), {
    interests,
    updatedAt: serverTimestamp(),
  });
}