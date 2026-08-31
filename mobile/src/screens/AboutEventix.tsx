import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';

export default function AboutEventix({ navigation }: any) {
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
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: colors.text, paddingRight: 40 }}>Về Eventix</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="items-center py-10">
          <View style={{ width: 96, height: 96, backgroundColor: colors.accent, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 }}>
            <MaterialIcons name="confirmation-number" size={50} color="white" />
          </View>
          <Text style={{ fontSize: 30, fontWeight: '900', color: colors.text, marginTop: 24 }}>Eventix</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>Version 1.0.0 (Beta)</Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, marginBottom: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Sứ mệnh của chúng tôi</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
            Eventix là nền tảng quản lý và phân phối vé sự kiện hàng đầu, được xây dựng để mang lại trải nghiệm mua vé mượt mà, bảo mật và hiện đại cho mọi người yêu thích nghệ thuật và giải trí.
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 24, marginTop: 16 }}>
            Chúng tôi tin rằng việc tiếp cận các sự kiện văn hóa, âm nhạc và thể thao nên thật đơn giản - chỉ với vài bước chạm trên điện thoại của bạn.
          </Text>
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 24, marginBottom: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 24 }}>Kết nối với chúng tôi</Text>
          <View className="flex-row justify-around">
            <TouchableOpacity className="items-center">
              <View className="w-12 h-12 bg-[#3b5998] rounded-full items-center justify-center mb-2">
                <FontAwesome name="facebook" size={24} color="white" />
              </View>
              <Text style={{ color: colors.text, fontSize: 12 }}>Facebook</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center">
              <View style={{ width: 48, height: 48, backgroundColor: '#000', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: colors.border }}>
                <FontAwesome name="github" size={24} color="white" />
              </View>
              <Text style={{ color: colors.text, fontSize: 12 }}>Github</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center">
              <View style={{ width: 48, height: 48, backgroundColor: '#e1306c', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <FontAwesome name="instagram" size={24} color="white" />
              </View>
              <Text style={{ color: colors.text, fontSize: 12 }}>Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="items-center pb-10">
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textAlign: 'center', opacity: 0.6 }}>
            © {new Date().getFullYear()} Eventix Team. All rights reserved.{"\n"}
            Designed for FPT University Case Study.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
