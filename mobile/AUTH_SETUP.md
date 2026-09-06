# Mobile Auth Setup Guide

## 📦 Cài đặt Dependencies

Chạy lệnh sau để cài đặt các dependencies cần thiết:

```bash
cd mobile
npm install @react-native-async-storage/async-storage
```

Hoặc nếu dùng yarn:

```bash
cd mobile
yarn add @react-native-async-storage/async-storage
```

## 🔧 Cấu hình API URL

Tạo file `.env` trong thư mục `mobile/` với nội dung:

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Hoặc nếu backend chạy trên IP khác:

```
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
```

## ✅ Đã Implement

### 1. **API Service** (`src/services/authApiService.ts`)
- ✅ Login
- ✅ Register
- ✅ Verify Email
- ✅ Resend Verification Code
- ✅ Forgot Password
- ✅ Verify Reset Code
- ✅ Reset Password
- ✅ Validate Token
- ✅ Logout

### 2. **Auth Context** (`src/context/AuthContext.tsx`)
- ✅ AsyncStorage integration để lưu token và user data
- ✅ Token validation khi app khởi động
- ✅ Real API calls với error handling
- ✅ Loading states
- ✅ Error states

### 3. **Screens**

#### **LoginScreen** (`src/screens/auth/LoginScreen.tsx`)
- ✅ Form validation (email, password)
- ✅ Show/hide password toggle
- ✅ Error handling và display
- ✅ Loading states
- ✅ Navigation đến CreateAccount và ForgotPassword
- ✅ Social login buttons (UI only)

#### **CreateAccount** (`src/screens/auth/CreateAccount.tsx`)
- ✅ Form validation (firstName, lastName, email, password, confirmPassword)
- ✅ Show/hide password toggles
- ✅ Error handling
- ✅ Navigation đến VerifyEmail sau khi register thành công
- ✅ ScrollView cho form dài

#### **ForgotPassword** (`src/screens/auth/ForgotPassword.tsx`)
- ✅ Multi-step flow:
  - Step 1: Nhập email
  - Step 2: Nhập verification code
  - Step 3: Nhập password mới
- ✅ Form validation cho từng step
- ✅ Resend code với cooldown
- ✅ Navigation back/forward giữa các steps

#### **VerifyEmail** (`src/screens/auth/VerifyEmail.tsx`)
- ✅ 6-digit code input
- ✅ Resend code với 60s cooldown
- ✅ Error handling
- ✅ Navigation đến Login sau khi verify thành công

### 4. **Navigation** (`src/navigation/AppNavigator.tsx`)
- ✅ Auth state checking
- ✅ Conditional rendering của auth screens vs app screens
- ✅ Tất cả auth screens đã được đăng ký

## 🚀 Cách sử dụng

### Login
```typescript
const { login, isLoading, error } = useAuth();

const handleLogin = async () => {
  const success = await login(email, password);
  if (success) {
    // User đã được đăng nhập, navigation tự động
  }
};
```

### Register
```typescript
const { register } = useAuth();

const handleRegister = async () => {
  const result = await register(firstName, lastName, email, password);
  if (result.success && result.requiresVerification) {
    // Navigate to VerifyEmail screen
    navigation.replace('VerifyEmail', { email: result.email });
  }
};
```

### Logout
```typescript
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // User đã được logout, navigation tự động về Login
};
```

## 📝 Lưu ý

1. **API URL**: Đảm bảo backend API Gateway đang chạy tại port 4000 (hoặc cập nhật trong `.env`)

2. **Token Storage**: Token được lưu trong AsyncStorage với key `auth_token`

3. **User Data**: User data được lưu trong AsyncStorage với key `user_data`

4. **Token Validation**: Khi app khởi động, token sẽ được validate với backend. Nếu token không hợp lệ, user sẽ bị logout tự động.

5. **Error Handling**: Tất cả errors được hiển thị trong UI và tự động clear sau 5 giây.

6. **Loading States**: Tất cả API calls có loading states để prevent multiple submissions.

## 🔐 Security Notes

- Token được lưu trong AsyncStorage (không phải secure storage)
- Để bảo mật hơn, có thể sử dụng `expo-secure-store` cho production
- Password không được lưu trữ, chỉ được gửi qua API
- Token được gửi trong Authorization header: `Bearer {token}`

## 🐛 Troubleshooting

### Lỗi "Cannot find module '@react-native-async-storage/async-storage'"
- Chạy `npm install` hoặc `yarn install` trong thư mục `mobile/`

### Lỗi "Network request failed"
- Kiểm tra API URL trong `.env`
- Đảm bảo backend đang chạy
- Kiểm tra firewall/network settings

### Token không được lưu
- Kiểm tra AsyncStorage permissions (nếu cần)
- Kiểm tra console logs để debug

## 📚 Next Steps

1. Cài đặt dependencies: `npm install`
2. Cấu hình API URL trong `.env`
3. Test các flows:
   - Register → Verify Email → Login
   - Login → Use App → Logout
   - Forgot Password → Reset Password → Login
4. Tùy chỉnh UI/UX nếu cần
5. Thêm social login integration (Google, Facebook) nếu cần
