import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface SavedBarcode {
  id: string
  company: string
  location: string
  keyNo: string
  barcodeCode: string
  noOfKeys: string
  createdAt: Date
  lastUpdate?: Date
  lastReturn?: Date
  lastDraw?: Date
}

const COLLECTION_NAME = "barcodes"

export const saveBarcodeToFirebase = async (barcode: Omit<SavedBarcode, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...barcode,
      createdAt: new Date(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error saving barcode:", error)
    throw error
  }
}

export const getSavedBarcodes = async (): Promise<SavedBarcode[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        noOfKeys: data.noOfKeys || "1", // Default to "1" if missing
        lastUpdate: data.lastUpdate ? data.lastUpdate.toDate() : undefined,
        lastReturn: data.lastReturn ? data.lastReturn.toDate() : undefined,
        lastDraw: data.lastDraw ? data.lastDraw.toDate() : undefined,
      }
    }) as SavedBarcode[]
  } catch (error) {
    console.error("Error getting saved barcodes:", error)
    throw error
  }
}

export const deleteSavedBarcode = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error("Error deleting barcode:", error)
    throw error
  }
}

export const getBarcodeByCode = async (barcodeCode: string): Promise<SavedBarcode | null> => {
  try {
    const q = query(collection(db, COLLECTION_NAME))
    const querySnapshot = await getDocs(q)

    const barcodeDoc = querySnapshot.docs.find((doc) => doc.data().barcodeCode === barcodeCode)

    if (!barcodeDoc) {
      return null
    }

    const data = barcodeDoc.data()
    return {
      id: barcodeDoc.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      noOfKeys: data.noOfKeys || "1",
      lastUpdate: data.lastUpdate ? data.lastUpdate.toDate() : undefined,
      lastReturn: data.lastReturn ? data.lastReturn.toDate() : undefined,
      lastDraw: data.lastDraw ? data.lastDraw.toDate() : undefined,
    } as SavedBarcode
  } catch (error) {
    console.error("Error getting barcode by code:", error)
    throw error
  }
}

export const updateBarcodeTimestamp = async (barcodeCode: string, action: "sign-in" | "sign-out") => {
  try {
    const q = query(collection(db, COLLECTION_NAME))
    const querySnapshot = await getDocs(q)

    const barcodeDoc = querySnapshot.docs.find((doc) => doc.data().barcodeCode === barcodeCode)

    if (!barcodeDoc) {
      throw new Error("Barcode not found")
    }

    const updateData: any = {
      lastUpdate: new Date(),
    }

    if (action === "sign-in") {
      updateData.lastReturn = new Date()
    } else if (action === "sign-out") {
      updateData.lastDraw = new Date()
    }

    await updateDoc(doc(db, COLLECTION_NAME, barcodeDoc.id), updateData)
  } catch (error) {
    console.error("Error updating barcode timestamp:", error)
    throw error
  }
}

export const loadBarcodesFromFirebase = getSavedBarcodes
export const deleteBarcodeFromFirebase = deleteSavedBarcode
