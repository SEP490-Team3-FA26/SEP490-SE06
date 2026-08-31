// WebViewScreen.tsx - In-app WebView browser for PayOS checkout and OAuth
import React from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { HeaderBar } from '../../components/ui/HeaderBar';

export const WebViewScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { title = 'Trình Duyệt', url } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title={title}
        subtitle={url || ''}
        onBack={() => navigation.goBack()}
        gradientVariant="ocean"
      />
      <View style={styles.content}>
        <Text style={styles.urlText}>Đang tải trang: {url}</Text>
        <Text style={styles.hint}>
          (Trong môi trường ứng dụng thực tế hoặc web, giao diện WebView / In-app Browser sẽ hiển thị tại đây).
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  urlText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0891B2',
    textAlign: 'center',
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
