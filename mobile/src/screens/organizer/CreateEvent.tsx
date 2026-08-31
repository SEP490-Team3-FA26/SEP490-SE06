import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function CreateEvent({ navigation }: any) {
  return (
    <View className="flex-1 bg-[#0a0014]">
      <View className="flex-row items-center p-4 pt-12 bg-[#1a0033] border-b border-[#4d0099]">
        <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 bg-[#2a004d] rounded-full items-center justify-center border border-[#4d0099]">
          <MaterialIcons name="arrow-back" size={24} color="#d500f9" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-white pr-10">Create Event</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <TouchableOpacity className="w-full h-40 bg-[#1a0033] border-2 border-dashed border-[#d500f9] rounded-3xl items-center justify-center mb-6">
          <MaterialIcons name="add-photo-alternate" size={48} color="#b388ff" />
          <Text className="text-[#b388ff] font-bold mt-2">Upload Event Cover</Text>
        </TouchableOpacity>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Event Title</Text>
        <View className="bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-6 justify-center">
          <TextInput 
            className="text-base text-white"
            placeholder="E.g. Neon Nights Festival"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <View className="flex-row justify-between mb-6">
          <View className="flex-1 mr-2">
            <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Date</Text>
            <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4">
              <MaterialIcons name="event" size={20} color="#00e5ff" />
              <TextInput 
                className="flex-1 ml-3 text-base text-white"
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#6a1b9a"
              />
            </View>
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Time</Text>
            <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4">
              <MaterialIcons name="access-time" size={20} color="#00e5ff" />
              <TextInput 
                className="flex-1 ml-3 text-base text-white"
                placeholder="HH:MM"
                placeholderTextColor="#6a1b9a"
              />
            </View>
          </View>
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Location</Text>
        <View className="flex-row items-center bg-[#1a0033] border border-[#4d0099] h-14 rounded-2xl px-4 mb-6">
          <MaterialIcons name="location-on" size={20} color="#d500f9" />
          <TextInput 
            className="flex-1 ml-3 text-base text-white"
            placeholder="Search venue or address"
            placeholderTextColor="#6a1b9a"
          />
        </View>

        <Text className="text-sm font-bold text-[#b388ff] uppercase tracking-wider mb-2 ml-2">Description</Text>
        <View className="bg-[#1a0033] border border-[#4d0099] rounded-2xl px-4 py-3 mb-8">
          <TextInput 
            className="text-base text-white h-24"
            placeholder="Tell people what your event is about..."
            placeholderTextColor="#6a1b9a"
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="w-full bg-[#d500f9] h-14 rounded-2xl items-center justify-center mb-8 shadow-[0_0_20px_rgba(213,0,249,0.4)]"
        >
          <Text className="text-white font-bold text-lg tracking-wide">Publish Event</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
