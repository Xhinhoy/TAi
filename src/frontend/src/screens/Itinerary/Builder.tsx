import React, { useState } from "react";
import { View, TextInput, Button, FlatList, Text, Alert } from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getAuth } from "firebase/auth";
export default function Builder(){
  const [title,setTitle] = useState("");
  const [city,setCity] = useState("Santiago");
  const [days,setDays] = useState("3");
  const [items,setItems] = useState<string[]>([]);
  const [newItem,setNewItem] = useState("");
  const addItem = ()=>{ if(newItem){ setItems((s)=>[...s,newItem]); setNewItem(""); } };
  const save = async ()=>{
    try{
      const uid = getAuth().currentUser?.uid;
      if(!uid) throw new Error("No autenticado");
      await addDoc(collection(db,"itineraries"), {
        ownerUid: uid, title, city, days: Number(days),
        items: items.map((name, i)=>({ day:1, placeId:`mock-${i}`, start:"10:00", end:"11:00", notes:name })),
        createdAt: serverTimestamp()
      });
      Alert.alert("OK","Itinerario guardado"); setTitle(""); setItems([]);
    }catch(e:any){ Alert.alert("Error",e.message); }
  };
  return (
    <View style={{ padding:16, gap:12 }}>
      <Text style={{fontSize:20, fontWeight:"700"}}>Nuevo Itinerario</Text>
      <TextInput placeholder="Título" value={title} onChangeText={setTitle} style={{borderWidth:1, borderRadius:8, padding:12}} />
      <TextInput placeholder="Ciudad" value={city} onChangeText={setCity} style={{borderWidth:1, borderRadius:8, padding:12}} />
      <TextInput placeholder="Días" value={days} onChangeText={setDays} keyboardType="numeric" style={{borderWidth:1, borderRadius:8, padding:12}} />
      <View style={{flexDirection:"row", gap:8}}>
        <TextInput placeholder="Agregar nota/lugar" value={newItem} onChangeText={setNewItem} style={{flex:1, borderWidth:1, borderRadius:8, padding:12}} />
        <Button title="+" onPress={addItem} />
      </View>
      <FlatList data={items} keyExtractor={(x,i)=>String(i)} renderItem={({item})=> <Text>- {item}</Text>} />
      <Button title="Guardar" onPress={save} />
    </View>
  );
}
