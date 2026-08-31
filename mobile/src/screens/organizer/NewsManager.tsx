import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContextType';
import { useAuth } from '../../context/AuthContext';
import { NewsLocalService, NewsPost } from '../../services/newsLocalService';

export default function NewsManager({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [posts, setPosts] = useState<NewsPost[]>([]);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await NewsLocalService.listByAuthor(user.id);
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const createPost = async () => {
    if (!user?.id || !title.trim() || !summary.trim() || !content.trim()) return;
    try {
      setSaving(true);
      await NewsLocalService.create({
        title,
        summary,
        content,
        imageUrl,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`.trim(),
        isPublished: true,
      });
      setTitle('');
      setSummary('');
      setContent('');
      setImageUrl('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (id: string) => {
    await NewsLocalService.togglePublish(id);
    await load();
  };

  const removePost = async (id: string) => {
    Alert.alert(
      'Gỡ tin?',
      'Tin sẽ bị xóa khỏi bảng tin người dùng. Bạn có chắc chắn muốn gỡ?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ tin',
          style: 'destructive',
          onPress: async () => {
            await NewsLocalService.remove(id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Quản lý tin tức</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>Tạo tin mới</Text>
          <TextInput
            placeholder="Tiêu đề"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 8 }}
          />
          <TextInput
            placeholder="Tóm tắt ngắn"
            placeholderTextColor={colors.textSecondary}
            value={summary}
            onChangeText={setSummary}
            style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginBottom: 8 }}
          />
          <TextInput
            placeholder="Nội dung"
            placeholderTextColor={colors.textSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, minHeight: 120 }}
          />
          <TextInput
            placeholder="Link ảnh đại diện (tuỳ chọn)"
            placeholderTextColor={colors.textSecondary}
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 8 }}
          />
          <TouchableOpacity
            onPress={() => void createPost()}
            disabled={saving}
            style={{ marginTop: 10, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}
          >
            {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '700' }}>Đăng tin</Text>}
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.text, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>Tin của bạn</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : posts.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>Bạn chưa có bài viết nào.</Text>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{post.title}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{post.summary}</Text>
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity onPress={() => void togglePublish(post.id)} style={{ marginRight: 12 }}>
                  <Text style={{ color: post.isPublished ? '#22c55e' : '#f59e0b', fontWeight: '700' }}>
                    {post.isPublished ? 'Đang hiển thị' : 'Đang ẩn'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void removePost(post.id)}>
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Gỡ tin</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

