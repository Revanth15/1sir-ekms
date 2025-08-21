import { db } from "./firebase"
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore"

export interface ActivityLog {
  id?: string
  maskedNric: string
  barcodeCode: string
  company: string
  location: string
  keyNo: string
  action: "sign-in" | "sign-out"
  rank: string
  name: string
  number: string
  timestamp: Date
  createdAt: Date
}

export const logActivity = async (logData: Omit<ActivityLog, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "activity_logs"), {
      ...logData,
      timestamp: Timestamp.fromDate(logData.timestamp),
      createdAt: Timestamp.now(),
    })
    console.log("[v0] Activity logged with ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error logging activity:", error)
    throw error
  }
}

export const subscribeToLogs = (callback: (logs: ActivityLog[]) => void) => {
  const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"))

  return onSnapshot(q, (snapshot) => {
    const logs: ActivityLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as ActivityLog[]

    callback(logs)
  })
}

export function maskNRIC(nric: string): string {
    if (nric.length < 4) return '*****';
    return '*****' + nric.slice(-4);
}
