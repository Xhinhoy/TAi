// src/database/itineraries.repository.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Itinerary } from "../types/domain";

const COLLECTION_NAME = "itineraries";

export class ItinerariesRepository {

  async create(itineraryData: Omit<Itinerary, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...itineraryData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async getById(id: string): Promise<Itinerary | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Itinerary;
    }
    return null;
  }

  async getByUser(ownerUid: string): Promise<Itinerary[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("ownerUid", "==", ownerUid),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Itinerary));
  }

  async getByCity(city: string, limitCount: number = 10): Promise<Itinerary[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("city", "==", city),
      orderBy("score", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Itinerary));
  }

  async getTopRated(limitCount: number = 10): Promise<Itinerary[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("score", ">=", 4),
      orderBy("score", "desc"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Itinerary));
  }

  async update(id: string, updates: Partial<Itinerary>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  async getByUserAndCity(ownerUid: string, city: string): Promise<Itinerary[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("ownerUid", "==", ownerUid),
      where("city", "==", city),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Itinerary));
  }
}