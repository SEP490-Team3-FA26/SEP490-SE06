import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const FAQ_DATA = [
  {
    q: "Làm thế nào để đổi vé?",
    a: "Bạn có thể vào lịch sử mua vé, chọn vé cần đổi và chọn phương thức hỗ trợ. Lưu ý vé chỉ được đổi trước 24h sự kiện diễn ra."
  },
  {
    q: "Tôi có được hoàn tiền khi hủy vé không?",
    a: "Tùy thuộc vào chính sách của ban tổ chức. Thông thường, bạn sẽ được hoàn 70-90% nếu hủy sớm."
  },
  {
    q: "Làm sao để liên hệ ban tổ chức?",
    a: "Trong trang chi tiết sự kiện, bạn sẽ tìm thấy nút 'Liên hệ ban tổ chức' ở phía dưới cùng."
  }
];

import { useTheme } from '../context/ThemeContextType';

export default function HelpSupport({ navigation }: any) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ width: 40, height: 40, backgroundColor: colors.surfaceSecondary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text, paddingRight: 40 }}>Hỗ trợ</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-6">
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 8 }}>Câu hỏi thường gặp (FAQ)</Text>
        
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, overflow: 'hidden', marginBottom: 32 }}>
          {FAQ_DATA.map((item, index) => (
            <View key={index} style={index !== FAQ_DATA.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {}}>
              <TouchableOpacity 
                onPress={() => setExpanded(expanded === index ? null : index)}
                className="flex-row items-center justify-between p-5"
              >
                <Text style={{ flex: 1, color: colors.text, fontWeight: 'bold', marginRight: 8 }}>{item.q}</Text>
                <MaterialIcons name={expanded === index ? "expand-less" : "expand-more"} size={24} color={colors.accent} />
              </TouchableOpacity>
              {expanded === index && (
                <View className="px-5 pb-5 pt-0">
                  <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 8 }}>Gửi phản hồi</Text>
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 20, marginBottom: 32 }}>
          <Text style={{ color: colors.text, fontSize: 12, marginBottom: 8, marginLeft: 4 }}>Vấn đề của bạn</Text>
          <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, minHeight: 120 }}>
            <TextInput
              multiline
              textAlignVertical="top"
              style={{ color: colors.text, fontSize: 14 }}
              placeholder="Mô tả chi tiết vấn đề bạn đang gặp phải..."
              placeholderTextColor={colors.textSecondary + '80'}
            />
          </View>
          <TouchableOpacity 
            onPress={() => Alert.alert('Gửi thành công', 'Cảm ơn phản hồi của bạn, chúng tôi sẽ sớm liên hệ lại.')}
            style={{ backgroundColor: colors.accent, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Gửi yêu cầu hỗ trợ</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 8 }}>Liên hệ trực tiếp</Text>
        <View className="flex-row gap-4 mb-10">
          <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <MaterialIcons name="email" size={24} color={colors.accent} />
            <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 8 }}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <MaterialIcons name="phone" size={24} color={colors.accentSecondary} />
            <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 8 }}>Hotline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <MaterialIcons name="chat" size={24} color="#7c4dff" />
            <Text style={{ color: colors.text, fontWeight: 'bold', marginTop: 8 }}>Live Chat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
