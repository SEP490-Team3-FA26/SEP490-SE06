import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContextType';
import { NewsLocalService, NewsPost } from '../services/newsLocalService';

export default function NewsDetail({ navigation, route }: any) {
  const { colors } = useTheme();
  const { postId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<NewsPost | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await NewsLocalService.getById(postId);
        setPost(data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [postId]);

  const handleShare = async () => {
    if (!post) return;
    await Share.share({
      message: `${post.title}\n\n${post.summary}\n\nEventix News`,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', flex: 1 }}>Chi tiết tin tức</Text>
        <TouchableOpacity onPress={() => void handleShare()}>
          <MaterialIcons name="share" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !post ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textSecondary }}>Không tìm thấy bài viết.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={[styles.heroBlock, { backgroundColor: '#111827' }]}>
            {!!post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            )}
            <View style={styles.heroOverlay} />
            <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', padding: 12, width: '100%', position: 'absolute', bottom: 0 }}>
              <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>TIN NỔI BẬT</Text>
              <Text style={{ color: 'white', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{post.title}</Text>
            </View>
          </View>
          <View style={{ padding: 16 }}>
          <Text style={{ color: colors.textSecondary, marginTop: 8, marginBottom: 14 }}>
            {post.authorName} • {new Date(post.createdAt).toLocaleString('vi-VN')}
          </Text>
          <Text style={{ color: colors.text, lineHeight: 23 }}>{post.content}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    width: '100%',
    height: 220,
    position: 'relative',
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
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
});

