import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Log } from "@/interfaces/Log"

export async function addLogEntry(logData: Omit<Log, "logId" | "timestamp">) {
  try {
    await addDoc(collection(db, "logs"), {
      ...logData,
      timestamp: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error adding log entry:", error)
  }
}