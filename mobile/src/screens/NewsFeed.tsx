import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Image, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';
import { useAuth } from '../context/AuthContext';
import { NewsLocalService, NewsPost } from '../services/newsLocalService';

export default function NewsFeed({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<NewsPost[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await NewsLocalService.listPublished();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleShare = async (post: NewsPost) => {
    await Share.share({
      message: `${post.title}\n\n${post.summary}\n\nEventix News`,
    });
  };

  const handleRemove = async (post: NewsPost) => {
    Alert.alert(
      'Gỡ tin?',
      `Bạn muốn gỡ bài "${post.title}" khỏi bảng tin?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ tin',
          style: 'destructive',
          onPress: async () => {
            await NewsLocalService.remove(post.id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>TIN NHANH EVENTIX</Text>
        <View style={{ marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Bản tin sự kiện</Text>
          <TouchableOpacity onPress={load} style={{ padding: 4 }}>
            <MaterialIcons name="refresh" size={22} color={colors.accent} />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Cập nhật liên tục cho người dùng</Text>
          {(user?.role === 'organizer' || user?.role === 'admin') && (
            <TouchableOpacity onPress={() => navigation.navigate('NewsManager')} style={{ backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Đăng tin</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {posts.length === 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary }}>Chưa có tin tức nào được xuất bản.</Text>
            </View>
          ) : (
            posts.map((post, index) => (
              <TouchableOpacity
                key={post.id}
                onPress={() => navigation.navigate('NewsDetail', { postId: post.id })}
                style={{ backgroundColor: colors.surface, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
              >
                <View style={[styles.heroBlock, { height: index === 0 ? 190 : 150, backgroundColor: '#1f2937' }]}>
                  {!!post.imageUrl && (
                    <Image
                      source={{ uri: post.imageUrl }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.heroOverlay} />
                  <View style={styles.heroFallback}>
                    <MaterialIcons name="newspaper" size={26} color="#e5e7eb" />
                    <Text style={styles.heroFallbackText}>BẢN TIN EVENTIX</Text>
                  </View>
                  <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{index === 0 ? 'NỔI BẬT' : 'TIN MỚI'}</Text>
                  </View>
                </View>

                <View style={{ padding: 12 }}>
                  <Text style={{ color: colors.text, fontSize: index === 0 ? 19 : 16, fontWeight: '800' }}>{post.title}</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 6 }}>{post.summary}</Text>
                  <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {post.authorName} • {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {(user?.role === 'organizer' || user?.role === 'admin') && (
                        <TouchableOpacity onPress={() => void handleRemove(post)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                          <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                          <Text style={{ color: '#ef4444', marginLeft: 4, fontWeight: '700' }}>Gỡ tin</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => void handleShare(post)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialIcons name="share" size={18} color={colors.accent} />
                        <Text style={{ color: colors.accent, marginLeft: 4, fontWeight: '700' }}>Chia sẻ</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(17, 24, 39, 0.25)',
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroFallbackText: {
    color: '#e5e7eb',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

