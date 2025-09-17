import React, { useState } from "react";
import { View, TextInput, FlatList, Text, TouchableOpacity } from "react-native";
import { searchPlaces } from "../../api/places.api";
export default function Search(){
  const [q,setQ] = useState("");
  const [data,setData] = useState<any[]>([]);
  const onChange = async (text:string)=>{
    setQ(text);
    if(text.length<2){ setData([]); return; }
    const res = await searchPlaces();
    setData(res.filter(x => x.name.toLowerCase().includes(text.toLowerCase())));
  };
  return (
    <View style={{ flex:1, padding:16 }}>
      <TextInput placeholder="Busca lugares" value={q} onChangeText={onChange} style={{ borderWidth:1, borderRadius:8, padding:12 }} />
      <FlatList
        data={data}
        keyExtractor={(item)=> item.id}
        renderItem={({item})=> (
          <TouchableOpacity style={{ paddingVertical:12 }}>
            <Text style={{ fontWeight:"600" }}>{item.name}</Text>
            <Text>{item.address}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
