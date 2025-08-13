import { Timestamp } from "firebase/firestore";

export interface Log {
    logId: string;
    room: string;
    company: string;
    keyNo: string;
    barcode: string;
    action: string;
    actionBy: string;
    timestamp: Timestamp;
}