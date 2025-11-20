// src/database/places.repository.ts
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
import { Place } from "../types/domain";

const COLLECTION_NAME = "places";

export class PlacesRepository {

  async create(placeData: Omit<Place, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...placeData,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async getById(id: string): Promise<Place | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Place;
    }
    return null;
  }

  async getByCity(city: string, limitCount: number = 50): Promise<Place[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("address", ">=", city),
      where("address", "<=", city + "\uf8ff"),
      orderBy("address"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Place));
  }

  async getByCategories(categories: string[], limitCount: number = 20): Promise<Place[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("categories", "array-contains-any", categories),
      orderBy("rating", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Place));
  }

  async searchByName(searchTerm: string, limitCount: number = 20): Promise<Place[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("name", ">=", searchTerm),
      where("name", "<=", searchTerm + "\uf8ff"),
      orderBy("name"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Place));
  }

  async update(id: string, updates: Partial<Place>): Promise<void> {
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

  async getAll(limitCount: number = 100): Promise<Place[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Place));
  }
}