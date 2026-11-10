# Tổng Hợp Toàn Bộ Quy Chuẩn Kỹ Thuật UI/UX & Hiệu Năng React Native (Rules Handbook)
### Dự án WDP301/SEP490 • Hệ Thống Nhà Thuốc Chuỗi ABC PHARMACY
> Tài liệu này gộp toàn bộ 42 quy chuẩn kỹ thuật chi tiết của hệ thống thành một file duy nhất để dễ dàng tra cứu, đối soát và giữ sạch cây thư mục dự án.

---

## 📑 Mục Lục Quy Tắc (Table of Contents)

### [1. Core Rendering (Rendering & Crash Prevention)](#rendering)
- [Never Use && with Potentially Falsy Values](#rendering-no-falsy-and)
- [Wrap Strings in Text Components](#rendering-text-in-text-component)

### [2. List Performance & Virtualization](#list-performance)
- [Hoist callbacks to the root of lists](#list-performance-callbacks)
- [Optimize List Performance with Stable Object References](#list-performance-function-references)
- [Use Compressed Images in Lists](#list-performance-images)
- [Avoid Inline Objects in renderItem](#list-performance-inline-objects)
- [Keep List Items Lightweight](#list-performance-item-expensive)
- [Pass Primitives to List Items for Memoization](#list-performance-item-memo)
- [Use Item Types for Heterogeneous Lists](#list-performance-item-types)
- [Use a List Virtualizer for Any List](#list-performance-virtualize)

### [3. GPU Animation & Gestures (60fps)](#animation)
- [Prefer useDerivedValue Over useAnimatedReaction](#animation-derived-value)
- [Use GestureDetector for Animated Press States](#animation-gesture-detector-press)
- [Animate Transform and Opacity Instead of Layout Properties](#animation-gpu-properties)

### [4. Scroll Performance](#scroll)
- [Never Track Scroll Position in useState](#scroll-position-no-state)

### [5. Native Navigation & Modals](#navigation)
- [Use Native Navigators for Navigation](#navigation-native-navigators)

### [6. Medical UX & Zero-Border Style (GPP Long Châu)](#medical)
- [medical-offline-reminder](#medical-offline-reminder)
- [medical-ui-health-passport](#medical-ui-health-passport)
- [medical-ui-large-fonts](#medical-ui-large-fonts)
- [medical-ui-zero-border](#medical-ui-zero-border)

### [7. React State Optimization](#react-state)
- [useState Dispatch updaters for State That Depends on Current Value](#react-state-dispatcher)
- [Use fallback state instead of initialState](#react-state-fallback)
- [Minimize State Variables and Derive Values](#react-state-minimize)

### [8. State Architecture & Ground Truth](#state)
- [State Must Represent Ground Truth](#state-ground-truth)

### [9. React Compiler Compatibility](#react-compiler)
- [Destructure Functions Early in Render (React Compiler)](#react-compiler-destructure-functions)
- [Use .get() and .set() for Reanimated Shared Values (not .value)](#react-compiler-reanimated-shared-values)

### [10. User Interface, Modals & Menus](#ui)
- [Use expo-image for Optimized Images](#ui-expo-image)
- [Use Galeria for Image Galleries and Lightbox](#ui-image-gallery)
- [Measuring View Dimensions](#ui-measure-views)
- [Use Native Menus for Dropdowns and Context Menus](#ui-menus)
- [Use Native Modals Over JS-Based Bottom Sheets](#ui-native-modals)
- [Use Pressable Instead of Touchable Components](#ui-pressable)
- [Use contentInsetAdjustmentBehavior for Safe Areas](#ui-safe-area-scroll)
- [Use contentInset for Dynamic ScrollView Spacing](#ui-scrollview-content-inset)
- [Modern React Native Styling Patterns](#ui-styling)

### [11. Design System Architecture](#design-system)
- [Use Compound Components Over Polymorphic Children](#design-system-compound-components)

### [12. Monorepo & Native Dependencies](#monorepo)
- [Install Native Dependencies in App Directory](#monorepo-native-deps-in-app)
- [Use Single Dependency Versions Across Monorepo](#monorepo-single-dependency-versions)

### [13. Dependencies & Module Wrappers](#imports)
- [Import from Design System Folder](#imports-design-system-folder)

### [14. JavaScript Micro-Optimizations](#js)
- [Hoist Intl Formatter Creation](#js-hoist-intl)

### [15. Typography & Font Loading](#fonts)
- [Load fonts natively at build time](#fonts-config-plugin)

---

<a id="rendering"></a>

# 1. Core Rendering (Rendering & Crash Prevention)
**Mức độ ưu tiên:** `CRITICAL`

---

<a id="rendering-no-falsy-and"></a>

## Never Use && with Potentially Falsy Values

Never use `{value && <Component />}` when `value` could be an empty string or
`0`. These are falsy but JSX-renderable—React Native will try to render them as
text outside a `<Text>` component, causing a hard crash in production.

**Incorrect (crashes if count is 0 or name is ""):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {name && <Text>{name}</Text>}
      {count && <Text>{count} items</Text>}
    </View>
  )
}
// If name="" or count=0, renders the falsy value → crash
```

**Correct (ternary with null):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {name ? <Text>{name}</Text> : null}
      {count ? <Text>{count} items</Text> : null}
    </View>
  )
}
```

**Correct (explicit boolean coercion):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  return (
    <View>
      {!!name && <Text>{name}</Text>}
      {!!count && <Text>{count} items</Text>}
    </View>
  )
}
```

**Best (early return):**

```tsx
function Profile({ name, count }: { name: string; count: number }) {
  if (!name) return null

  return (
    <View>
      <Text>{name}</Text>
      {count > 0 ? <Text>{count} items</Text> : null}
    </View>
  )
}
```

Early returns are clearest. When using conditionals inline, prefer ternary or
explicit boolean checks.

**Lint rule:** Enable `react/jsx-no-leaked-render` from
[eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-leaked-render.md)
to catch this automatically.

> **Mức độ:** `CRITICAL` | **Thẻ:** `rendering, conditional, jsx, crash`

---

<a id="rendering-text-in-text-component"></a>

## Wrap Strings in Text Components

Strings must be rendered inside `<Text>`. React Native crashes if a string is a
direct child of `<View>`.

**Incorrect (crashes):**

```tsx
import { View } from 'react-native'

function Greeting({ name }: { name: string }) {
  return <View>Hello, {name}!</View>
}
// Error: Text strings must be rendered within a <Text> component.
```

**Correct:**

```tsx
import { View, Text } from 'react-native'

function Greeting({ name }: { name: string }) {
  return (
    <View>
      <Text>Hello, {name}!</Text>
    </View>
  )
}
```

> **Mức độ:** `CRITICAL` | **Thẻ:** `rendering, text, core`

---

<a id="list-performance"></a>

# 2. List Performance & Virtualization
**Mức độ ưu tiên:** `HIGH`

---

<a id="list-performance-callbacks"></a>

## List performance callbacks

**Impact: HIGH (Fewer re-renders and faster lists)**

When passing callback functions to list items, create a single instance of the
callback at the root of the list. Items should then call it with a unique
identifier.

**Incorrect (creates a new callback on each render):**

```typescript
return (
  <LegendList
    renderItem={({ item }) => {
      // bad: creates a new callback on each render
      const onPress = () => handlePress(item.id)
      return <Item key={item.id} item={item} onPress={onPress} />
    }}
  />
)
```

**Correct (a single function instance passed to each item):**

```typescript
const onPress = useCallback(() => handlePress(item.id), [handlePress, item.id])

return (
  <LegendList
    renderItem={({ item }) => (
      <Item key={item.id} item={item} onPress={onPress} />
    )}
  />
)
```

Reference: [Link to documentation or resource](https://example.com)

> **Mức độ:** `MEDIUM` | **Thẻ:** `tag1, tag2`

---

<a id="list-performance-function-references"></a>

## Optimize List Performance with Stable Object References

Don't map or filter data before passing to virtualized lists. Virtualization
relies on object reference stability to know what changed—new references cause
full re-renders of all visible items. Attempt to prevent frequent renders at the
list-parent level.

Where needed, use context selectors within list items.

**Incorrect (creates new object references on every keystroke):**

```tsx
function DomainSearch() {
  const { keyword, setKeyword } = useKeywordZustandState()
  const { data: tlds } = useTlds()

  // Bad: creates new objects on every render, reparenting the entire list on every keystroke
  const domains = tlds.map((tld) => ({
    domain: `${keyword}.${tld.name}`,
    tld: tld.name,
    price: tld.price,
  }))

  return (
    <>
      <TextInput value={keyword} onChangeText={setKeyword} />
      <LegendList
        data={domains}
        renderItem={({ item }) => <DomainItem item={item} keyword={keyword} />}
      />
    </>
  )
}
```

**Correct (stable references, transform inside items):**

```tsx
const renderItem = ({ item }) => <DomainItem tld={item} />

function DomainSearch() {
  const { data: tlds } = useTlds()

  return (
    <LegendList
      // good: as long as the data is stable, LegendList will not re-render the entire list
      data={tlds}
      renderItem={renderItem}
    />
  )
}

function DomainItem({ tld }: { tld: Tld }) {
  // good: transform within items, and don't pass the dynamic data as a prop
  // good: use a selector function from zustand to receive a stable string back
  const domain = useKeywordZustandState((s) => s.keyword + '.' + tld.name)
  return <Text>{domain}</Text>
}
```

**Updating parent array reference:**

Creating a new array instance can be okay, as long as its inner object
references are stable. For instance, if you sort a list of objects:

```tsx
// good: creates a new array instance without mutating the inner objects
// good: parent array reference is unaffected by typing and updating "keyword"
const sortedTlds = tlds.toSorted((a, b) => a.name.localeCompare(b.name))

return <LegendList data={sortedTlds} renderItem={renderItem} />
```

Even though this creates a new array instance `sortedTlds`, the inner object
references are stable.

**With zustand for dynamic data (avoids parent re-renders):**

```tsx
const useSearchStore = create<{ keyword: string }>(() => ({ keyword: '' }))

function DomainSearch() {
  const { data: tlds } = useTlds()

  return (
    <>
      <SearchInput />
      <LegendList
        data={tlds}
        // if you aren't using React Compiler, wrap renderItem with useCallback
        renderItem={({ item }) => <DomainItem tld={item} />}
      />
    </>
  )
}

function DomainItem({ tld }: { tld: Tld }) {
  // Select only what you need—component only re-renders when keyword changes
  const keyword = useSearchStore((s) => s.keyword)
  const domain = `${keyword}.${tld.name}`
  return <Text>{domain}</Text>
}
```

Virtualization can now skip items that haven't changed when typing. Only visible
items (~20) re-render on keystroke, rather than the parent.

**Deriving state within list items based on parent data (avoids parent
re-renders):**

For components where the data is conditional based on the parent state, this
pattern is even more important. For example, if you are checking if an item is
favorited, toggling favorites only re-renders one component if the item itself
is in charge of accessing the state rather than the parent:

```tsx
function DomainItemFavoriteButton({ tld }: { tld: Tld }) {
  const isFavorited = useFavoritesStore((s) => s.favorites.has(tld.id))
  return <TldFavoriteButton isFavorited={isFavorited} />
}
```

Note: if you're using the React Compiler, you can read React Context values
directly within list items. Although this is slightly slower than using a
Zustand selector in most cases, the effect may be negligible.

> **Mức độ:** `CRITICAL` | **Thẻ:** `lists, performance, flatlist, virtualization`

---

<a id="list-performance-images"></a>

## Use Compressed Images in Lists

Always load compressed, appropriately-sized images in lists. Full-resolution
images consume excessive memory and cause scroll jank. Request thumbnails from
your server or use an image CDN with resize parameters.

**Incorrect (full-resolution images):**

```tsx
function ProductItem({ product }: { product: Product }) {
  return (
    <View>
      {/* 4000x3000 image loaded for a 100x100 thumbnail */}
      <Image
        source={{ uri: product.imageUrl }}
        style={{ width: 100, height: 100 }}
      />
      <Text>{product.name}</Text>
    </View>
  )
}
```

**Correct (request appropriately-sized image):**

```tsx
function ProductItem({ product }: { product: Product }) {
  // Request a 200x200 image (2x for retina)
  const thumbnailUrl = `${product.imageUrl}?w=200&h=200&fit=cover`

  return (
    <View>
      <Image
        source={{ uri: thumbnailUrl }}
        style={{ width: 100, height: 100 }}
        contentFit='cover'
      />
      <Text>{product.name}</Text>
    </View>
  )
}
```

Use an optimized image component with built-in caching and placeholder support,
such as `expo-image` or `SolitoImage` (which uses `expo-image` under the hood).
Request images at 2x the display size for retina screens.

> **Mức độ:** `HIGH` | **Thẻ:** `lists, images, performance, optimization`

---

<a id="list-performance-inline-objects"></a>

## Avoid Inline Objects in renderItem

Don't create new objects inside `renderItem` to pass as props. Inline objects
create new references on every render, breaking memoization. Pass primitive
values directly from `item` instead.

**Incorrect (inline object breaks memoization):**

```tsx
function UserList({ users }: { users: User[] }) {
  return (
    <LegendList
      data={users}
      renderItem={({ item }) => (
        <UserRow
          // Bad: new object on every render
          user={{ id: item.id, name: item.name, avatar: item.avatar }}
        />
      )}
    />
  )
}
```

**Incorrect (inline style object):**

```tsx
renderItem={({ item }) => (
  <UserRow
    name={item.name}
    // Bad: new style object on every render
    style={{ backgroundColor: item.isActive ? 'green' : 'gray' }}
  />
)}
```

**Correct (pass item directly or primitives):**

```tsx
function UserList({ users }: { users: User[] }) {
  return (
    <LegendList
      data={users}
      renderItem={({ item }) => (
        // Good: pass the item directly
        <UserRow user={item} />
      )}
    />
  )
}
```

**Correct (pass primitives, derive inside child):**

```tsx
renderItem={({ item }) => (
  <UserRow
    id={item.id}
    name={item.name}
    isActive={item.isActive}
  />
)}

const UserRow = memo(function UserRow({ id, name, isActive }: Props) {
  // Good: derive style inside memoized component
  const backgroundColor = isActive ? 'green' : 'gray'
  return <View style={[styles.row, { backgroundColor }]}>{/* ... */}</View>
})
```

**Correct (hoist static styles in module scope):**

```tsx
const activeStyle = { backgroundColor: 'green' }
const inactiveStyle = { backgroundColor: 'gray' }

renderItem={({ item }) => (
  <UserRow
    name={item.name}
    // Good: stable references
    style={item.isActive ? activeStyle : inactiveStyle}
  />
)}
```

Passing primitives or stable references allows `memo()` to skip re-renders when
the actual values haven't changed.

**Note:** If you have the React Compiler enabled, it handles memoization
automatically and these manual optimizations become less critical.

> **Mức độ:** `HIGH` | **Thẻ:** `lists, performance, flatlist, virtualization, memo`

---

<a id="list-performance-item-expensive"></a>

## Keep List Items Lightweight

List items should be as inexpensive as possible to render. Minimize hooks, avoid
queries, and limit React Context access. Virtualized lists render many items
during scroll—expensive items cause jank.

**Incorrect (heavy list item):**

```tsx
function ProductRow({ id }: { id: string }) {
  // Bad: query inside list item
  const { data: product } = useQuery(['product', id], () => fetchProduct(id))
  // Bad: multiple context accesses
  const theme = useContext(ThemeContext)
  const user = useContext(UserContext)
  const cart = useContext(CartContext)
  // Bad: expensive computation
  const recommendations = useMemo(
    () => computeRecommendations(product),
    [product]
  )

  return <View>{/* ... */}</View>
}
```

**Correct (lightweight list item):**

```tsx
function ProductRow({ name, price, imageUrl }: Props) {
  // Good: receives only primitives, minimal hooks
  return (
    <View>
      <Image source={{ uri: imageUrl }} />
      <Text>{name}</Text>
      <Text>{price}</Text>
    </View>
  )
}
```

**Move data fetching to parent:**

```tsx
// Parent fetches all data once
function ProductList() {
  const { data: products } = useQuery(['products'], fetchProducts)

  return (
    <LegendList
      data={products}
      renderItem={({ item }) => (
        <ProductRow name={item.name} price={item.price} imageUrl={item.image} />
      )}
    />
  )
}
```

**For shared values, use Zustand selectors instead of Context:**

```tsx
// Incorrect: Context causes re-render when any cart value changes
function ProductRow({ id, name }: Props) {
  const { items } = useContext(CartContext)
  const inCart = items.includes(id)
  // ...
}

// Correct: Zustand selector only re-renders when this specific value changes
function ProductRow({ id, name }: Props) {
  // use Set.has (created once at the root) instead of Array.includes()
  const inCart = useCartStore((s) => s.items.has(id))
  // ...
}
```

**Guidelines for list items:**

- No queries or data fetching
- No expensive computations (move to parent or memoize at parent level)
- Prefer Zustand selectors over React Context
- Minimize useState/useEffect hooks
- Pass pre-computed values as props

The goal: list items should be simple rendering functions that take props and
return JSX.

> **Mức độ:** `HIGH` | **Thẻ:** `lists, performance, virtualization, hooks`

---

<a id="list-performance-item-memo"></a>

## Pass Primitives to List Items for Memoization

When possible, pass only primitive values (strings, numbers, booleans) as props
to list item components. Primitives enable shallow comparison in `memo()` to
work correctly, skipping re-renders when values haven't changed.

**Incorrect (object prop requires deep comparison):**

```tsx
type User = { id: string; name: string; email: string; avatar: string }

const UserRow = memo(function UserRow({ user }: { user: User }) {
  // memo() compares user by reference, not value
  // If parent creates new user object, this re-renders even if data is same
  return <Text>{user.name}</Text>
})

renderItem={({ item }) => <UserRow user={item} />}
```

This can still be optimized, but it is harder to memoize properly.

**Correct (primitive props enable shallow comparison):**

```tsx
const UserRow = memo(function UserRow({
  id,
  name,
  email,
}: {
  id: string
  name: string
  email: string
}) {
  // memo() compares each primitive directly
  // Re-renders only if id, name, or email actually changed
  return <Text>{name}</Text>
})

renderItem={({ item }) => (
  <UserRow id={item.id} name={item.name} email={item.email} />
)}
```

**Pass only what you need:**

```tsx
// Incorrect: passing entire item when you only need name
<UserRow user={item} />

// Correct: pass only the fields the component uses
<UserRow name={item.name} avatarUrl={item.avatar} />
```

**For callbacks, hoist or use item ID:**

```tsx
// Incorrect: inline function creates new reference
<UserRow name={item.name} onPress={() => handlePress(item.id)} />

// Correct: pass ID, handle in child
<UserRow id={item.id} name={item.name} />

const UserRow = memo(function UserRow({ id, name }: Props) {
  const handlePress = useCallback(() => {
    // use id here
  }, [id])
  return <Pressable onPress={handlePress}><Text>{name}</Text></Pressable>
})
```

Primitive props make memoization predictable and effective.

**Note:** If you have the React Compiler enabled, you do not need to use
`memo()` or `useCallback()`, but the object references still apply.

> **Mức độ:** `HIGH` | **Thẻ:** `lists, performance, memo, primitives`

---

<a id="list-performance-item-types"></a>

## Use Item Types for Heterogeneous Lists

When a list has different item layouts (messages, images, headers, etc.), use a
`type` field on each item and provide `getItemType` to the list. This puts items
into separate recycling pools so a message component never gets recycled into an
image component.

**Incorrect (single component with conditionals):**

```tsx
type Item = { id: string; text?: string; imageUrl?: string; isHeader?: boolean }

function ListItem({ item }: { item: Item }) {
  if (item.isHeader) {
    return <HeaderItem title={item.text} />
  }
  if (item.imageUrl) {
    return <ImageItem url={item.imageUrl} />
  }
  return <MessageItem text={item.text} />
}

function Feed({ items }: { items: Item[] }) {
  return (
    <LegendList
      data={items}
      renderItem={({ item }) => <ListItem item={item} />}
      recycleItems
    />
  )
}
```

**Correct (typed items with separate components):**

```tsx
type HeaderItem = { id: string; type: 'header'; title: string }
type MessageItem = { id: string; type: 'message'; text: string }
type ImageItem = { id: string; type: 'image'; url: string }
type FeedItem = HeaderItem | MessageItem | ImageItem

function Feed({ items }: { items: FeedItem[] }) {
  return (
    <LegendList
      data={items}
      keyExtractor={(item) => item.id}
      getItemType={(item) => item.type}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'header':
            return <SectionHeader title={item.title} />
          case 'message':
            return <MessageRow text={item.text} />
          case 'image':
            return <ImageRow url={item.url} />
        }
      }}
      recycleItems
    />
  )
}
```

**Why this matters:**

- **Recycling efficiency**: Items with the same type share a recycling pool
- **No layout thrashing**: A header never recycles into an image cell
- **Type safety**: TypeScript can narrow the item type in each branch
- **Better size estimation**: Use `getEstimatedItemSize` with `itemType` for
  accurate estimates per type

```tsx
<LegendList
  data={items}
  keyExtractor={(item) => item.id}
  getItemType={(item) => item.type}
  getEstimatedItemSize={(index, item, itemType) => {
    switch (itemType) {
      case 'header':
        return 48
      case 'message':
        return 72
      case 'image':
        return 300
      default:
        return 72
    }
  }}
  renderItem={({ item }) => {
    /* ... */
  }}
  recycleItems
/>
```

Reference:
[LegendList getItemType](https://legendapp.com/open-source/list/api/props/#getitemtype-v2)

> **Mức độ:** `HIGH` | **Thẻ:** `list, performance, recycling, heterogeneous, LegendList`

---

<a id="list-performance-virtualize"></a>

## Use a List Virtualizer for Any List

Use a list virtualizer like LegendList or FlashList instead of ScrollView with
mapped children—even for short lists. Virtualizers only render visible items,
reducing memory usage and mount time. ScrollView renders all children upfront,
which gets expensive quickly.

**Incorrect (ScrollView renders all items at once):**

```tsx
function Feed({ items }: { items: Item[] }) {
  return (
    <ScrollView>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </ScrollView>
  )
}
// 50 items = 50 components mounted, even if only 10 visible
```

**Correct (virtualizer renders only visible items):**

```tsx
import { LegendList } from '@legendapp/list'

function Feed({ items }: { items: Item[] }) {
  return (
    <LegendList
      data={items}
      // if you aren't using React Compiler, wrap these with useCallback
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.id}
      estimatedItemSize={80}
    />
  )
}
// Only ~10-15 visible items mounted at a time
```

**Alternative (FlashList):**

```tsx
import { FlashList } from '@shopify/flash-list'

function Feed({ items }: { items: Item[] }) {
  return (
    <FlashList
      data={items}
      // if you aren't using React Compiler, wrap these with useCallback
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.id}
    />
  )
}
```

Benefits apply to any screen with scrollable content—profiles, settings, feeds,
search results. Default to virtualization.

> **Mức độ:** `HIGH` | **Thẻ:** `lists, performance, virtualization, scrollview`

---

<a id="animation"></a>

# 3. GPU Animation & Gestures (60fps)
**Mức độ ưu tiên:** `HIGH`

---

<a id="animation-derived-value"></a>

## Prefer useDerivedValue Over useAnimatedReaction

When deriving a shared value from another, use `useDerivedValue` instead of
`useAnimatedReaction`. Derived values are declarative, automatically track
dependencies, and return a value you can use directly. Animated reactions are
for side effects, not derivations.

**Incorrect (useAnimatedReaction for derivation):**

```tsx
import { useSharedValue, useAnimatedReaction } from 'react-native-reanimated'

function MyComponent() {
  const progress = useSharedValue(0)
  const opacity = useSharedValue(1)

  useAnimatedReaction(
    () => progress.value,
    (current) => {
      opacity.value = 1 - current
    }
  )

  // ...
}
```

**Correct (useDerivedValue):**

```tsx
import { useSharedValue, useDerivedValue } from 'react-native-reanimated'

function MyComponent() {
  const progress = useSharedValue(0)

  const opacity = useDerivedValue(() => 1 - progress.get())

  // ...
}
```

Use `useAnimatedReaction` only for side effects that don't produce a value
(e.g., triggering haptics, logging, calling `runOnJS`).

Reference:
[Reanimated useDerivedValue](https://docs.swmansion.com/react-native-reanimated/docs/core/useDerivedValue)

> **Mức độ:** `MEDIUM` | **Thẻ:** `animation, reanimated, derived-value`

---

<a id="animation-gesture-detector-press"></a>

## Use GestureDetector for Animated Press States

For animated press states (scale, opacity on press), use `GestureDetector` with
`Gesture.Tap()` and shared values instead of Pressable's
`onPressIn`/`onPressOut`. Gesture callbacks run on the UI thread as worklets—no
JS thread round-trip for press animations.

**Incorrect (Pressable with JS thread callbacks):**

```tsx
import { Pressable } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'

function AnimatedButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.95))}
      onPressOut={() => (scale.value = withTiming(1))}
    >
      <Animated.View style={animatedStyle}>
        <Text>Press me</Text>
      </Animated.View>
    </Pressable>
  )
}
```

**Correct (GestureDetector with UI thread worklets):**

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated'

function AnimatedButton({ onPress }: { onPress: () => void }) {
  // Store the press STATE (0 = not pressed, 1 = pressed)
  const pressed = useSharedValue(0)

  const tap = Gesture.Tap()
    .onBegin(() => {
      pressed.set(withTiming(1))
    })
    .onFinalize(() => {
      pressed.set(withTiming(0))
    })
    .onEnd(() => {
      runOnJS(onPress)()
    })

  // Derive visual values from the state
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(withTiming(pressed.get()), [0, 1], [1, 0.95]) },
    ],
  }))

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={animatedStyle}>
        <Text>Press me</Text>
      </Animated.View>
    </GestureDetector>
  )
}
```

Store the press **state** (0 or 1), then derive the scale via `interpolate`.
This keeps the shared value as ground truth. Use `runOnJS` to call JS functions
from worklets. Use `.set()` and `.get()` for React Compiler compatibility.

Reference:
[Gesture Handler Tap Gesture](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/tap-gesture)

> **Mức độ:** `MEDIUM` | **Thẻ:** `animation, gestures, press, reanimated`

---

<a id="animation-gpu-properties"></a>

## Animate Transform and Opacity Instead of Layout Properties

Avoid animating `width`, `height`, `top`, `left`, `margin`, or `padding`. These trigger layout recalculation on every frame. Instead, use `transform` (scale, translate) and `opacity` which run on the GPU without triggering layout.

**Incorrect (animates height, triggers layout every frame):**

```tsx
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'

function CollapsiblePanel({ expanded }: { expanded: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: withTiming(expanded ? 200 : 0), // triggers layout on every frame
    overflow: 'hidden',
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}
```

**Correct (animates scaleY, GPU-accelerated):**

```tsx
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'

function CollapsiblePanel({ expanded }: { expanded: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: withTiming(expanded ? 1 : 0) },
    ],
    opacity: withTiming(expanded ? 1 : 0),
  }))

  return (
    <Animated.View style={[{ height: 200, transformOrigin: 'top' }, animatedStyle]}>
      {children}
    </Animated.View>
  )
}
```

**Correct (animates translateY for slide animations):**

```tsx
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'

function SlideIn({ visible }: { visible: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withTiming(visible ? 0 : 100) },
    ],
    opacity: withTiming(visible ? 1 : 0),
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}
```

GPU-accelerated properties: `transform` (translate, scale, rotate), `opacity`. Everything else triggers layout.

> **Mức độ:** `HIGH` | **Thẻ:** `animation, performance, reanimated, transform, opacity`

---

<a id="scroll"></a>

# 4. Scroll Performance
**Mức độ ưu tiên:** `HIGH`

---

<a id="scroll-position-no-state"></a>

## Never Track Scroll Position in useState

Never store scroll position in `useState`. Scroll events fire rapidly—state
updates cause render thrashing and dropped frames. Use a Reanimated shared value
for animations or a ref for non-reactive tracking.

**Incorrect (useState causes jank):**

```tsx
import { useState } from 'react'
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'

function Feed() {
  const [scrollY, setScrollY] = useState(0)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y) // re-renders on every frame
  }

  return <ScrollView onScroll={onScroll} scrollEventThrottle={16} />
}
```

**Correct (Reanimated for animations):**

```tsx
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated'

function Feed() {
  const scrollY = useSharedValue(0)

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y // runs on UI thread, no re-render
    },
  })

  return (
    <Animated.ScrollView
      onScroll={onScroll}
      // higher number has better performance, but it fires less often.
      // unset this if you need higher precision over performance.
      scrollEventThrottle={16}
    />
  )
}
```

**Correct (ref for non-reactive tracking):**

```tsx
import { useRef } from 'react'
import {
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'

function Feed() {
  const scrollY = useRef(0)

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y // no re-render
  }

  return <ScrollView onScroll={onScroll} scrollEventThrottle={16} />
}
```

> **Mức độ:** `HIGH` | **Thẻ:** `scroll, performance, reanimated, useRef`

---

<a id="navigation"></a>

# 5. Native Navigation & Modals
**Mức độ ưu tiên:** `HIGH`

---

<a id="navigation-native-navigators"></a>

## Use Native Navigators for Navigation

Always use native navigators instead of JS-based ones. Native navigators use
platform APIs (UINavigationController on iOS, Fragment on Android) for better
performance and native behavior.

**For stacks:** Use `@react-navigation/native-stack` or expo-router's default
stack (which uses native-stack). Avoid `@react-navigation/stack`.

**For tabs:** Use `react-native-bottom-tabs` (native) or expo-router's native
tabs. Avoid `@react-navigation/bottom-tabs` when native feel matters.

### Stack Navigation

**Incorrect (JS stack navigator):**

```tsx
import { createStackNavigator } from '@react-navigation/stack'

const Stack = createStackNavigator()

function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Details' component={DetailsScreen} />
    </Stack.Navigator>
  )
}
```

**Correct (native stack with react-navigation):**

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Home' component={HomeScreen} />
      <Stack.Screen name='Details' component={DetailsScreen} />
    </Stack.Navigator>
  )
}
```

**Correct (expo-router uses native stack by default):**

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router'

export default function Layout() {
  return <Stack />
}
```

### Tab Navigation

**Incorrect (JS bottom tabs):**

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'

const Tab = createBottomTabNavigator()

function App() {
  return (
    <Tab.Navigator>
      <Tab.Screen name='Home' component={HomeScreen} />
      <Tab.Screen name='Settings' component={SettingsScreen} />
    </Tab.Navigator>
  )
}
```

**Correct (native bottom tabs with react-navigation):**

```tsx
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation'

const Tab = createNativeBottomTabNavigator()

function App() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name='Home'
        component={HomeScreen}
        options={{
          tabBarIcon: () => ({ sfSymbol: 'house' }),
        }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          tabBarIcon: () => ({ sfSymbol: 'gear' }),
        }}
      />
    </Tab.Navigator>
  )
}
```

**Correct (expo-router native tabs):**

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs'

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name='index'>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf='house.fill' md='home' />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='settings'>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf='gear' md='settings' />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
```

On iOS, native tabs automatically enable `contentInsetAdjustmentBehavior` on the
first `ScrollView` at the root of each tab screen, so content scrolls correctly
behind the translucent tab bar. If you need to disable this, use
`disableAutomaticContentInsets` on the trigger.

### Prefer Native Header Options Over Custom Components

**Incorrect (custom header component):**

```tsx
<Stack.Screen
  name='Profile'
  component={ProfileScreen}
  options={{
    header: () => <CustomHeader title='Profile' />,
  }}
/>
```

**Correct (native header options):**

```tsx
<Stack.Screen
  name='Profile'
  component={ProfileScreen}
  options={{
    title: 'Profile',
    headerLargeTitleEnabled: true,
    headerSearchBarOptions: {
      placeholder: 'Search',
    },
  }}
/>
```

Native headers support iOS large titles, search bars, blur effects, and proper
safe area handling automatically.

### Why Native Navigators

- **Performance**: Native transitions and gestures run on the UI thread
- **Platform behavior**: Automatic iOS large titles, Android material design
- **System integration**: Scroll-to-top on tab tap, PiP avoidance, proper safe
  areas
- **Accessibility**: Platform accessibility features work automatically

Reference:

- [React Navigation Native Stack](https://reactnavigation.org/docs/native-stack-navigator)
- [React Native Bottom Tabs with React Navigation](https://oss.callstack.com/react-native-bottom-tabs/docs/guides/usage-with-react-navigation)
- [React Native Bottom Tabs with Expo Router](https://oss.callstack.com/react-native-bottom-tabs/docs/guides/usage-with-expo-router)
- [Expo Router Native Tabs](https://docs.expo.dev/router/advanced/native-tabs)

> **Mức độ:** `HIGH` | **Thẻ:** `navigation, react-navigation, expo-router, native-stack, tabs`

---

<a id="medical"></a>

# 6. Medical UX & Zero-Border Style (GPP Long Châu)
**Mức độ ưu tiên:** `HIGH`

---

<a id="medical-offline-reminder"></a>

# medical-offline-reminder - Lịch Nhắc Uống Thuốc Offline

## Tầm Quan Trọng (Impact: HIGH - Độ tin cậy y tế 100%)

Đối với tính năng nhắc uống thuốc:
- Lịch nhắc được tạo tự động 1-chạm từ đơn thuốc đã mua (`createRemindersFromOrder`).
- Áp dụng thuật toán **Cửa sổ trượt 7 ngày (Sliding Window)** lưu vào bộ nhớ cục bộ `AsyncStorage`.
- Khi đến giờ uống thuốc: phát chuông cảnh báo kèm modal yêu cầu xác nhận đã uống.

```tsx
// ✅ Mẫu tạo lịch nhắc tự động từ đơn hàng
const handleAutoSchedule = async (order: Order) => {
  const reminders = await createRemindersFromOrder(order);
  for (const rem of reminders) {
    await MedicineReminderService.scheduleReminderSlidingWindow(rem, 7);
  }
  showToast.success('Tạo lịch thành công', `Đã lập lịch nhắc uống cho ${reminders.length} loại thuốc.`);
};
```

> **Mức độ:** `HIGH` | **Thẻ:** `medical`

---

<a id="medical-ui-health-passport"></a>

# medical-ui-health-passport - Tích Hợp Sổ Sức Khỏe Số & Đối Soát Lâm Sàng

## Tầm Quan Trọng (Impact: CRITICAL - An toàn tính mạng bệnh nhân & Tiêu chuẩn GPP)

Trong hệ thống nhà thuốc ABC PHARMACY (WDP301/SEP490), mọi tương tác bán lẻ và đặt hàng đều phải bảo đảm an toàn dược lý:
1. Không bán thuốc chứa hoạt chất mà khách hàng bị dị ứng.
2. Cảnh báo tương tác thuốc nguy hiểm với bệnh nền mãn tính (viêm loét dạ dày, suy gan, suy thận, tim mạch).
3. Hỗ trợ hiển thị Mã QR Sổ Sức Khỏe Số (Digital Health Passport) để quét tại quầy offline.

## Luồng Tích Hợp Giao Diện

1. **Thẻ Sổ Sức Khỏe Trên Tab Tài Khoản:**
   - Đặt ngay sau khối Đơn của tôi.
   - Thẻ hiển thị tóm tắt: Nhóm máu, số lượng dị ứng, trạng thái bệnh nền.
   - Chạm vào mở `DigitalHealthPassportModal`.
2. **Cảnh Báo Lâm Sàng Trước Khi Mua Hàng:**
   - Tự động đối chiếu thành phần thuốc với danh sách `allergicIngredients` của bệnh nhân.
   - Nếu phát hiện dị ứng: chặn thanh toán hoặc hiển thị cảnh báo đỏ nổi bật, yêu cầu xác nhận chuyên môn của Dược sĩ.

```tsx
// ✅ Mẫu kiểm tra tương tác lâm sàng nhanh phía Client
export function checkPatientAllergyConflict(
  medicineIngredients: string[],
  patientAllergies: string[]
): { hasConflict: boolean; conflictingIngredient?: string } {
  if (!medicineIngredients?.length || !patientAllergies?.length) {
    return { hasConflict: false };
  }
  const cleanPatientAllergies = patientAllergies.map((a) => a.toLowerCase().trim());
  for (const ing of medicineIngredients) {
    if (cleanPatientAllergies.includes(ing.toLowerCase().trim())) {
      return { hasConflict: true, conflictingIngredient: ing };
    }
  }
  return { hasConflict: false };
}
```

> **Mức độ:** `HIGH` | **Thẻ:** `medical`

---

<a id="medical-ui-large-fonts"></a>

# medical-ui-large-fonts - Quy Chuẩn Chữ To & Thân Thiện Người Dùng Y Tế

## Tầm Quan Trọng (Impact: HIGH - Thân thiện người dùng lớn tuổi & Accessibility)

Người dùng mua thuốc, xem đơn thuốc và tra cứu sức khỏe trên thiết bị di động thường bao gồm đối tượng người trung niên, cao tuổi hoặc người đang trong trạng thái mệt mỏi, mắt kém.
Cỡ chữ quá nhỏ (<12px) hoặc quá nhiều dòng chữ phụ rối mắt làm giảm khả năng đọc hiểu đơn thuốc, gây nhầm lẫn liều dùng nguy hiểm.

## Quy Chuẩn Kích Thước Chữ (Typography Hierarchy)

| Thành phần UI | Kích thước chuẩn | Độ đậm (Font Weight) | Màu sắc khuyến nghị |
| :--- | :--- | :--- | :--- |
| **Giá tiền sản phẩm** | `18px - 22px` | `800` (Bold) | Đỏ `#DC2626` / Xanh `#0284C7` |
| **Tên thuốc chính** | `16px - 17.5px` | `700` (Bold) | Đen xám `#0F172A` |
| **Tiêu đề phân mục** | `15px - 16px` | `700` (Bold) | Xám đậm `#334155` |
| **Liều dùng / Hướng dẫn** | `13px - 14px` | `600` (Medium) | Xanh ngọc `#0E7490` |
| **Nút bấm hành động** | `14.5px - 16px` | `700` (Bold) | Trắng `#FFFFFF` |
| **Kích thước bấm chạm tối thiểu** | `44 x 44px` | - | `hitSlop` mở rộng tối thiểu 6-8px |

## Triển Khai Không Chuẩn (Incorrect: Chữ li ti, nhiều dòng phụ rườm rà)

```tsx
// ❌ SAI: Chữ 10-11px, nhồi nhét subtitle dài dòng
<View>
  <Text style={{ fontSize: 13, fontWeight: '400' }}>Paracetamol 500mg Hộp 100 viên nén</Text>
  <Text style={{ fontSize: 10, color: '#94A3B8' }}>Dược phẩm kê đơn theo tiêu chuẩn bộ y tế thông tư 02</Text>
  <Text style={{ fontSize: 12, fontWeight: '700' }}>15.000 đ</Text>
</View>
```

## Triển Khai Chuẩn (Correct: Rõ ràng, giá to đậm, lược bỏ chữ thừa)

```tsx
// ✅ ĐÚNG: Tên thuốc to rõ, giá bán nổi bật, không chữ phụ rối mắt
<View>
  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }} numberOfLines={2}>
    Paracetamol 500mg
  </Text>
  <Text style={{ fontSize: 19, fontWeight: '800', color: '#DC2626', marginTop: 4 }}>
    15.000 ₫
  </Text>
</View>
```

> **Mức độ:** `HIGH` | **Thẻ:** `medical`

---

<a id="medical-ui-zero-border"></a>

# medical-ui-zero-border - Quy Chuẩn Thiết Kế Zero-Border (Chuẩn FPT Long Châu & Hiện Đại)

## Tầm Quan Trọng (Impact: HIGH - Cải thiện tính thẩm mỹ & thị giác y tế)

Việc bọc các khối giao diện trong các đường viền cứng nhắc (`borderWidth: 1`, `borderColor: '#E2E8F0'`) khiến màn hình ứng dụng di động bị chia cắt vụn vặt, nặng nề và tạo cảm giác ngột ngạt khi hiển thị nhiều nhóm dược phẩm.
Thiết kế **Zero-Border** sử dụng nền tổng thể màu xám dịu nhạt (`#F8FAFC` hoặc `#F1F5F9`), các thẻ nội dung màu trắng (`#FFFFFF`) bo góc lớn mềm mại (`borderRadius: 16` - `20px`), kết hợp đổ bóng tự nhiên nhẹ (`shadowOpacity: 0.04 - 0.06`, `elevation: 2 - 3`) giúp mắt người dùng dễ dàng lướt qua thông tin mà không bị xao nhãng.

## Triển Khai Không Chuẩn (Incorrect: Dùng border dày đặc bọc mọi thẻ)

```tsx
// ❌ SAI: Bọc viền border cứng nhắc quanh mọi component, tạo cảm giác chật chội
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1', // Viền cứng gây nặng mắt
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
```

## Triển Khai Chuẩn (Correct: Zero-Border với Shadow mềm mại và khoảng cách thoáng)

```tsx
// ✅ ĐÚNG: Nền thẻ trắng tinh, bo tròn 16px, không border, đổ bóng tự nhiên
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Bo góc lớn mềm mại
    padding: 16,
    // Không dùng borderWidth hay borderColor
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F0F9FF', // Phân biệt bằng nền màu pastel thay vì border
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
```

> **Mức độ:** `HIGH` | **Thẻ:** `medical`

---

<a id="react-state"></a>

# 7. React State Optimization
**Mức độ ưu tiên:** `MEDIUM`

---

<a id="react-state-dispatcher"></a>

## Use Dispatch Updaters for State That Depends on Current Value

When the next state depends on the current state, use a dispatch updater
(`setState(prev => ...)`) instead of reading the state variable directly in a
callback. This avoids stale closures and ensures you're comparing against the
latest value.

**Incorrect (reads state directly):**

```tsx
const [size, setSize] = useState<Size | undefined>(undefined)

const onLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  // size may be stale in this closure
  if (size?.width !== width || size?.height !== height) {
    setSize({ width, height })
  }
}
```

**Correct (dispatch updater):**

```tsx
const [size, setSize] = useState<Size | undefined>(undefined)

const onLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  setSize((prev) => {
    if (prev?.width === width && prev?.height === height) return prev
    return { width, height }
  })
}
```

Returning the previous value from the updater skips the re-render.

For primitive states, you don't need to compare values before firing a
re-render.

**Incorrect (unnecessary comparison for primitive state):**

```tsx
const [size, setSize] = useState<Size | undefined>(undefined)

const onLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  setSize((prev) => (prev === width ? prev : width))
}
```

**Correct (sets primitive state directly):**

```tsx
const [size, setSize] = useState<Size | undefined>(undefined)

const onLayout = (e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout
  setSize(width)
}
```

However, if the next state depends on the current state, you should still use a
dispatch updater.

**Incorrect (reads state directly from the callback):**

```tsx
const [count, setCount] = useState(0)

const onTap = () => {
  setCount(count + 1)
}
```

**Correct (dispatch updater):**

```tsx
const [count, setCount] = useState(0)

const onTap = () => {
  setCount((prev) => prev + 1)
}
```

> **Mức độ:** `MEDIUM` | **Thẻ:** `state, hooks, useState, callbacks`

---

<a id="react-state-fallback"></a>

## Use fallback state instead of initialState

Use `undefined` as initial state and nullish coalescing (`??`) to fall back to
parent or server values. State represents user intent only—`undefined` means
"user hasn't chosen yet." This enables reactive fallbacks that update when the
source changes, not just on initial render.

**Incorrect (syncs state, loses reactivity):**

```tsx
type Props = { fallbackEnabled: boolean }

function Toggle({ fallbackEnabled }: Props) {
  const [enabled, setEnabled] = useState(defaultEnabled)
  // If fallbackEnabled changes, state is stale
  // State mixes user intent with default value

  return <Switch value={enabled} onValueChange={setEnabled} />
}
```

**Correct (state is user intent, reactive fallback):**

```tsx
type Props = { fallbackEnabled: boolean }

function Toggle({ fallbackEnabled }: Props) {
  const [_enabled, setEnabled] = useState<boolean | undefined>(undefined)
  const enabled = _enabled ?? defaultEnabled
  // undefined = user hasn't touched it, falls back to prop
  // If defaultEnabled changes, component reflects it
  // Once user interacts, their choice persists

  return <Switch value={enabled} onValueChange={setEnabled} />
}
```

**With server data:**

```tsx
function ProfileForm({ data }: { data: User }) {
  const [_theme, setTheme] = useState<string | undefined>(undefined)
  const theme = _theme ?? data.theme
  // Shows server value until user overrides
  // Server refetch updates the fallback automatically

  return <ThemePicker value={theme} onChange={setTheme} />
}
```

> **Mức độ:** `MEDIUM` | **Thẻ:** `state, hooks, derived-state, props, initialState`

---

<a id="react-state-minimize"></a>

## Minimize State Variables and Derive Values

Use the fewest state variables possible. If a value can be computed from existing state or props, derive it during render instead of storing it in state. Redundant state causes unnecessary re-renders and can drift out of sync.

**Incorrect (redundant state):**

```tsx
function Cart({ items }: { items: Item[] }) {
  const [total, setTotal] = useState(0)
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    setTotal(items.reduce((sum, item) => sum + item.price, 0))
    setItemCount(items.length)
  }, [items])

  return (
    <View>
      <Text>{itemCount} items</Text>
      <Text>Total: ${total}</Text>
    </View>
  )
}
```

**Correct (derived values):**

```tsx
function Cart({ items }: { items: Item[] }) {
  const total = items.reduce((sum, item) => sum + item.price, 0)
  const itemCount = items.length

  return (
    <View>
      <Text>{itemCount} items</Text>
      <Text>Total: ${total}</Text>
    </View>
  )
}
```

**Another example:**

```tsx
// Incorrect: storing both firstName, lastName, AND fullName
const [firstName, setFirstName] = useState('')
const [lastName, setLastName] = useState('')
const [fullName, setFullName] = useState('')

// Correct: derive fullName
const [firstName, setFirstName] = useState('')
const [lastName, setLastName] = useState('')
const fullName = `${firstName} ${lastName}`
```

State should be the minimal source of truth. Everything else is derived.

Reference: [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)

> **Mức độ:** `MEDIUM` | **Thẻ:** `state, derived-state, hooks, optimization`

---

<a id="state"></a>

# 8. State Architecture & Ground Truth
**Mức độ ưu tiên:** `MEDIUM`

---

<a id="state-ground-truth"></a>

## State Must Represent Ground Truth

State variables—both React `useState` and Reanimated shared values—should
represent the actual state of something (e.g., `pressed`, `progress`, `isOpen`),
not derived visual values (e.g., `scale`, `opacity`, `translateY`). Derive
visual values from state using computation or interpolation.

**Incorrect (storing the visual output):**

```tsx
const scale = useSharedValue(1)

const tap = Gesture.Tap()
  .onBegin(() => {
    scale.set(withTiming(0.95))
  })
  .onFinalize(() => {
    scale.set(withTiming(1))
  })

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.get() }],
}))
```

**Correct (storing the state, deriving the visual):**

```tsx
const pressed = useSharedValue(0) // 0 = not pressed, 1 = pressed

const tap = Gesture.Tap()
  .onBegin(() => {
    pressed.set(withTiming(1))
  })
  .onFinalize(() => {
    pressed.set(withTiming(0))
  })

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: interpolate(pressed.get(), [0, 1], [1, 0.95]) }],
}))
```

**Why this matters:**

State variables should represent real "state", not necessarily a desired end
result.

1. **Single source of truth** — The state (`pressed`) describes what's
   happening; visuals are derived
2. **Easier to extend** — Adding opacity, rotation, or other effects just
   requires more interpolations from the same state
3. **Debugging** — Inspecting `pressed = 1` is clearer than `scale = 0.95`
4. **Reusable logic** — The same `pressed` value can drive multiple visual
   properties

**Same principle for React state:**

```tsx
// Incorrect: storing derived values
const [isExpanded, setIsExpanded] = useState(false)
const [height, setHeight] = useState(0)

useEffect(() => {
  setHeight(isExpanded ? 200 : 0)
}, [isExpanded])

// Correct: derive from state
const [isExpanded, setIsExpanded] = useState(false)
const height = isExpanded ? 200 : 0
```

State is the minimal truth. Everything else is derived.

> **Mức độ:** `HIGH` | **Thẻ:** `state, derived-state, reanimated, hooks`

---

<a id="react-compiler"></a>

# 9. React Compiler Compatibility
**Mức độ ưu tiên:** `MEDIUM`

---

<a id="react-compiler-destructure-functions"></a>

## Destructure Functions Early in Render

This rule is only applicable if you are using the React Compiler.

Destructure functions from hooks at the top of render scope. Never dot into
objects to call functions. Destructured functions are stable references; dotting
creates new references and breaks memoization.

**Incorrect (dotting into object):**

```tsx
import { useRouter } from 'expo-router'

function SaveButton(props) {
  const router = useRouter()

  // bad: react-compiler will key the cache on "props" and "router", which are objects that change each render
  const handlePress = () => {
    props.onSave()
    router.push('/success') // unstable reference
  }

  return <Button onPress={handlePress}>Save</Button>
}
```

**Correct (destructure early):**

```tsx
import { useRouter } from 'expo-router'

function SaveButton({ onSave }) {
  const { push } = useRouter()

  // good: react-compiler will key on push and onSave
  const handlePress = () => {
    onSave()
    push('/success') // stable reference
  }

  return <Button onPress={handlePress}>Save</Button>
}
```

> **Mức độ:** `HIGH` | **Thẻ:** `rerender, hooks, performance, react-compiler`

---

<a id="react-compiler-reanimated-shared-values"></a>

## Use .get() and .set() for Shared Values with React Compiler

With React Compiler enabled, use `.get()` and `.set()` instead of reading or
writing `.value` directly on Reanimated shared values. The compiler can't track
property access—explicit methods ensure correct behavior.

**Incorrect (breaks with React Compiler):**

```tsx
import { useSharedValue } from 'react-native-reanimated'

function Counter() {
  const count = useSharedValue(0)

  const increment = () => {
    count.value = count.value + 1 // opts out of react compiler
  }

  return <Button onPress={increment} title={`Count: ${count.value}`} />
}
```

**Correct (React Compiler compatible):**

```tsx
import { useSharedValue } from 'react-native-reanimated'

function Counter() {
  const count = useSharedValue(0)

  const increment = () => {
    count.set(count.get() + 1)
  }

  return <Button onPress={increment} title={`Count: ${count.get()}`} />
}
```

See the
[Reanimated docs](https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/#react-compiler-support)
for more.

> **Mức độ:** `LOW` | **Thẻ:** `reanimated, react-compiler, shared-values`

---

<a id="ui"></a>

# 10. User Interface, Modals & Menus
**Mức độ ưu tiên:** `MEDIUM`

---

<a id="ui-expo-image"></a>

## Use expo-image for Optimized Images

Use `expo-image` instead of React Native's `Image`. It provides memory-efficient caching, blurhash placeholders, progressive loading, and better performance for lists.

**Incorrect (React Native Image):**

```tsx
import { Image } from 'react-native'

function Avatar({ url }: { url: string }) {
  return <Image source={{ uri: url }} style={styles.avatar} />
}
```

**Correct (expo-image):**

```tsx
import { Image } from 'expo-image'

function Avatar({ url }: { url: string }) {
  return <Image source={{ uri: url }} style={styles.avatar} />
}
```

**With blurhash placeholder:**

```tsx
<Image
  source={{ uri: url }}
  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
  contentFit="cover"
  transition={200}
  style={styles.image}
/>
```

**With priority and caching:**

```tsx
<Image
  source={{ uri: url }}
  priority="high"
  cachePolicy="memory-disk"
  style={styles.hero}
/>
```

**Key props:**

- `placeholder` — Blurhash or thumbnail while loading
- `contentFit` — `cover`, `contain`, `fill`, `scale-down`
- `transition` — Fade-in duration (ms)
- `priority` — `low`, `normal`, `high`
- `cachePolicy` — `memory`, `disk`, `memory-disk`, `none`
- `recyclingKey` — Unique key for list recycling

For cross-platform (web + native), use `SolitoImage` from `solito/image` which uses `expo-image` under the hood.

Reference: [expo-image](https://docs.expo.dev/versions/latest/sdk/image/)

> **Mức độ:** `HIGH` | **Thẻ:** `images, performance, expo-image, ui`

---

<a id="ui-image-gallery"></a>

## Use Galeria for Image Galleries and Lightbox

For image galleries with lightbox (tap to fullscreen), use `@nandorojo/galeria`.
It provides native shared element transitions with pinch-to-zoom, double-tap
zoom, and pan-to-close. Works with any image component including `expo-image`.

**Incorrect (custom modal implementation):**

```tsx
function ImageGallery({ urls }: { urls: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      {urls.map((url) => (
        <Pressable key={url} onPress={() => setSelected(url)}>
          <Image source={{ uri: url }} style={styles.thumbnail} />
        </Pressable>
      ))}
      <Modal visible={!!selected} onRequestClose={() => setSelected(null)}>
        <Image source={{ uri: selected! }} style={styles.fullscreen} />
      </Modal>
    </>
  )
}
```

**Correct (Galeria with expo-image):**

```tsx
import { Galeria } from '@nandorojo/galeria'
import { Image } from 'expo-image'

function ImageGallery({ urls }: { urls: string[] }) {
  return (
    <Galeria urls={urls}>
      {urls.map((url, index) => (
        <Galeria.Image index={index} key={url}>
          <Image source={{ uri: url }} style={styles.thumbnail} />
        </Galeria.Image>
      ))}
    </Galeria>
  )
}
```

**Single image:**

```tsx
import { Galeria } from '@nandorojo/galeria'
import { Image } from 'expo-image'

function Avatar({ url }: { url: string }) {
  return (
    <Galeria urls={[url]}>
      <Galeria.Image>
        <Image source={{ uri: url }} style={styles.avatar} />
      </Galeria.Image>
    </Galeria>
  )
}
```

**With low-res thumbnails and high-res fullscreen:**

```tsx
<Galeria urls={highResUrls}>
  {lowResUrls.map((url, index) => (
    <Galeria.Image index={index} key={url}>
      <Image source={{ uri: url }} style={styles.thumbnail} />
    </Galeria.Image>
  ))}
</Galeria>
```

**With FlashList:**

```tsx
<Galeria urls={urls}>
  <FlashList
    data={urls}
    renderItem={({ item, index }) => (
      <Galeria.Image index={index}>
        <Image source={{ uri: item }} style={styles.thumbnail} />
      </Galeria.Image>
    )}
    numColumns={3}
    estimatedItemSize={100}
  />
</Galeria>
```

Works with `expo-image`, `SolitoImage`, `react-native` Image, or any image
component.

Reference: [Galeria](https://github.com/nandorojo/galeria)

> **Mức độ:** `MEDIUM` | **Thẻ:** `images, gallery, lightbox, expo-image, ui`

---

<a id="ui-measure-views"></a>

## Measuring View Dimensions

Use both `useLayoutEffect` (synchronous) and `onLayout` (for updates). The sync
measurement gives you the initial size immediately; `onLayout` keeps it current
when the view changes. For non-primitive states, use a dispatch updater to
compare values and avoid unnecessary re-renders.

**Height only:**

```tsx
import { useLayoutEffect, useRef, useState } from 'react'
import { View, LayoutChangeEvent } from 'react-native'

function MeasuredBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<View>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    // Sync measurement on mount (RN 0.82+)
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setHeight(rect.height)
    // Pre-0.82: ref.current?.measure((x, y, w, h) => setHeight(h))
  }, [])

  const onLayout = (e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height)
  }

  return (
    <View ref={ref} onLayout={onLayout}>
      {children}
    </View>
  )
}
```

**Both dimensions:**

```tsx
import { useLayoutEffect, useRef, useState } from 'react'
import { View, LayoutChangeEvent } from 'react-native'

type Size = { width: number; height: number }

function MeasuredBox({ children }: { children: React.ReactNode }) {
  const ref = useRef<View>(null)
  const [size, setSize] = useState<Size | undefined>(undefined)

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setSize({ width: rect.width, height: rect.height })
  }, [])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize((prev) => {
      // for non-primitive states, compare values before firing a re-render
      if (prev?.width === width && prev?.height === height) return prev
      return { width, height }
    })
  }

  return (
    <View ref={ref} onLayout={onLayout}>
      {children}
    </View>
  )
}
```

Use functional setState to compare—don't read state directly in the callback.

> **Mức độ:** `MEDIUM` | **Thẻ:** `layout, measurement, onLayout, useLayoutEffect`

---

<a id="ui-menus"></a>

## Use Native Menus for Dropdowns and Context Menus

Use native platform menus instead of custom JS implementations. Native menus
provide built-in accessibility, consistent platform UX, and better performance.
Use [zeego](https://zeego.dev) for cross-platform native menus.

**Incorrect (custom JS menu):**

```tsx
import { useState } from 'react'
import { View, Pressable, Text } from 'react-native'

function MyMenu() {
  const [open, setOpen] = useState(false)

  return (
    <View>
      <Pressable onPress={() => setOpen(!open)}>
        <Text>Open Menu</Text>
      </Pressable>
      {open && (
        <View style={{ position: 'absolute', top: 40 }}>
          <Pressable onPress={() => console.log('edit')}>
            <Text>Edit</Text>
          </Pressable>
          <Pressable onPress={() => console.log('delete')}>
            <Text>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
```

**Correct (native menu with zeego):**

```tsx
import * as DropdownMenu from 'zeego/dropdown-menu'

function MyMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Pressable>
          <Text>Open Menu</Text>
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item key='edit' onSelect={() => console.log('edit')}>
          <DropdownMenu.ItemTitle>Edit</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Item
          key='delete'
          destructive
          onSelect={() => console.log('delete')}
        >
          <DropdownMenu.ItemTitle>Delete</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
```

**Context menu (long-press):**

```tsx
import * as ContextMenu from 'zeego/context-menu'

function MyContextMenu() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <View style={{ padding: 20 }}>
          <Text>Long press me</Text>
        </View>
      </ContextMenu.Trigger>

      <ContextMenu.Content>
        <ContextMenu.Item key='copy' onSelect={() => console.log('copy')}>
          <ContextMenu.ItemTitle>Copy</ContextMenu.ItemTitle>
        </ContextMenu.Item>

        <ContextMenu.Item key='paste' onSelect={() => console.log('paste')}>
          <ContextMenu.ItemTitle>Paste</ContextMenu.ItemTitle>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  )
}
```

**Checkbox items:**

```tsx
import * as DropdownMenu from 'zeego/dropdown-menu'

function SettingsMenu() {
  const [notifications, setNotifications] = useState(true)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Pressable>
          <Text>Settings</Text>
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.CheckboxItem
          key='notifications'
          value={notifications}
          onValueChange={() => setNotifications((prev) => !prev)}
        >
          <DropdownMenu.ItemIndicator />
          <DropdownMenu.ItemTitle>Notifications</DropdownMenu.ItemTitle>
        </DropdownMenu.CheckboxItem>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
```

**Submenus:**

```tsx
import * as DropdownMenu from 'zeego/dropdown-menu'

function MenuWithSubmenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Pressable>
          <Text>Options</Text>
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Item key='home' onSelect={() => console.log('home')}>
          <DropdownMenu.ItemTitle>Home</DropdownMenu.ItemTitle>
        </DropdownMenu.Item>

        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger key='more'>
            <DropdownMenu.ItemTitle>More Options</DropdownMenu.ItemTitle>
          </DropdownMenu.SubTrigger>

          <DropdownMenu.SubContent>
            <DropdownMenu.Item key='settings'>
              <DropdownMenu.ItemTitle>Settings</DropdownMenu.ItemTitle>
            </DropdownMenu.Item>

            <DropdownMenu.Item key='help'>
              <DropdownMenu.ItemTitle>Help</DropdownMenu.ItemTitle>
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}
```

Reference: [Zeego Documentation](https://zeego.dev/components/dropdown-menu)

> **Mức độ:** `HIGH` | **Thẻ:** `user-interface, menus, context-menus, zeego, accessibility`

---

<a id="ui-native-modals"></a>

## Use Native Modals Over JS-Based Bottom Sheets

Use native `<Modal>` with `presentationStyle="formSheet"` or React Navigation
v7's native form sheet instead of JS-based bottom sheet libraries. Native modals
have built-in gestures, accessibility, and better performance. Rely on native UI
for low-level primitives.

**Incorrect (JS-based bottom sheet):**

```tsx
import BottomSheet from 'custom-js-bottom-sheet'

function MyScreen() {
  const sheetRef = useRef<BottomSheet>(null)

  return (
    <View style={{ flex: 1 }}>
      <Button onPress={() => sheetRef.current?.expand()} title='Open' />
      <BottomSheet ref={sheetRef} snapPoints={['50%', '90%']}>
        <View>
          <Text>Sheet content</Text>
        </View>
      </BottomSheet>
    </View>
  )
}
```

**Correct (native Modal with formSheet):**

```tsx
import { Modal, View, Text, Button } from 'react-native'

function MyScreen() {
  const [visible, setVisible] = useState(false)

  return (
    <View style={{ flex: 1 }}>
      <Button onPress={() => setVisible(true)} title='Open' />
      <Modal
        visible={visible}
        presentationStyle='formSheet'
        animationType='slide'
        onRequestClose={() => setVisible(false)}
      >
        <View>
          <Text>Sheet content</Text>
        </View>
      </Modal>
    </View>
  )
}
```

**Correct (React Navigation v7 native form sheet):**

```tsx
// In your navigator
<Stack.Screen
  name='Details'
  component={DetailsScreen}
  options={{
    presentation: 'formSheet',
    sheetAllowedDetents: 'fitToContents',
  }}
/>
```

Native modals provide swipe-to-dismiss, proper keyboard avoidance, and
accessibility out of the box.

> **Mức độ:** `HIGH` | **Thẻ:** `modals, bottom-sheet, native, react-navigation`

---

<a id="ui-pressable"></a>

## Use Pressable Instead of Touchable Components

Never use `TouchableOpacity` or `TouchableHighlight`. Use `Pressable` from
`react-native` or `react-native-gesture-handler` instead.

**Incorrect (legacy Touchable components):**

```tsx
import { TouchableOpacity } from 'react-native'

function MyButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Text>Press me</Text>
    </TouchableOpacity>
  )
}
```

**Correct (Pressable):**

```tsx
import { Pressable } from 'react-native'

function MyButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text>Press me</Text>
    </Pressable>
  )
}
```

**Correct (Pressable from gesture handler for lists):**

```tsx
import { Pressable } from 'react-native-gesture-handler'

function ListItem({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Text>Item</Text>
    </Pressable>
  )
}
```

Use `react-native-gesture-handler` Pressable inside scrollable lists for better
gesture coordination, as long as you are using the ScrollView from
`react-native-gesture-handler` as well.

**For animated press states (scale, opacity changes):** Use `GestureDetector`
with Reanimated shared values instead of Pressable's style callback. See the
`animation-gesture-detector-press` rule.

> **Mức độ:** `LOW` | **Thẻ:** `ui, pressable, touchable, gestures`

---

<a id="ui-safe-area-scroll"></a>

## Use contentInsetAdjustmentBehavior for Safe Areas

Use `contentInsetAdjustmentBehavior="automatic"` on the root ScrollView instead of wrapping content in SafeAreaView or manual padding. This lets iOS handle safe area insets natively with proper scroll behavior.

**Incorrect (SafeAreaView wrapper):**

```tsx
import { SafeAreaView, ScrollView, View, Text } from 'react-native'

function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView>
        <View>
          <Text>Content</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
```

**Incorrect (manual safe area padding):**

```tsx
import { ScrollView, View, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function MyScreen() {
  const insets = useSafeAreaInsets()

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top }}>
      <View>
        <Text>Content</Text>
      </View>
    </ScrollView>
  )
}
```

**Correct (native content inset adjustment):**

```tsx
import { ScrollView, View, Text } from 'react-native'

function MyScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior='automatic'>
      <View>
        <Text>Content</Text>
      </View>
    </ScrollView>
  )
}
```

The native approach handles dynamic safe areas (keyboard, toolbars) and allows content to scroll behind the status bar naturally.

> **Mức độ:** `MEDIUM` | **Thẻ:** `safe-area, scrollview, layout`

---

<a id="ui-scrollview-content-inset"></a>

## Use contentInset for Dynamic ScrollView Spacing

When adding space to the top or bottom of a ScrollView that may change
(keyboard, toolbars, dynamic content), use `contentInset` instead of padding.
Changing `contentInset` doesn't trigger layout recalculation—it adjusts the
scroll area without re-rendering content.

**Incorrect (padding causes layout recalculation):**

```tsx
function Feed({ bottomOffset }: { bottomOffset: number }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: bottomOffset }}>
      {children}
    </ScrollView>
  )
}
// Changing bottomOffset triggers full layout recalculation
```

**Correct (contentInset for dynamic spacing):**

```tsx
function Feed({ bottomOffset }: { bottomOffset: number }) {
  return (
    <ScrollView
      contentInset={{ bottom: bottomOffset }}
      scrollIndicatorInsets={{ bottom: bottomOffset }}
    >
      {children}
    </ScrollView>
  )
}
// Changing bottomOffset only adjusts scroll bounds
```

Use `scrollIndicatorInsets` alongside `contentInset` to keep the scroll
indicator aligned. For static spacing that never changes, padding is fine.

> **Mức độ:** `LOW` | **Thẻ:** `scrollview, layout, contentInset, performance`

---

<a id="ui-styling"></a>

## Modern React Native Styling Patterns

Follow these styling patterns for cleaner, more consistent React Native code.

**Always use `borderCurve: 'continuous'` with `borderRadius`:**

```tsx
// Incorrect
{ borderRadius: 12 }

// Correct – smoother iOS-style corners
{ borderRadius: 12, borderCurve: 'continuous' }
```

**Use `gap` instead of margin for spacing between elements:**

```tsx
// Incorrect – margin on children
<View>
  <Text style={{ marginBottom: 8 }}>Title</Text>
  <Text style={{ marginBottom: 8 }}>Subtitle</Text>
</View>

// Correct – gap on parent
<View style={{ gap: 8 }}>
  <Text>Title</Text>
  <Text>Subtitle</Text>
</View>
```

**Use `padding` for space within, `gap` for space between:**

```tsx
<View style={{ padding: 16, gap: 12 }}>
  <Text>First</Text>
  <Text>Second</Text>
</View>
```

**Use `experimental_backgroundImage` for linear gradients:**

```tsx
// Incorrect – third-party gradient library
<LinearGradient colors={['#000', '#fff']} />

// Correct – native CSS gradient syntax
<View
  style={{
    experimental_backgroundImage: 'linear-gradient(to bottom, #000, #fff)',
  }}
/>
```

**Use CSS `boxShadow` string syntax for shadows:**

```tsx
// Incorrect – legacy shadow objects or elevation
{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 }
{ elevation: 4 }

// Correct – CSS box-shadow syntax
{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }
```

**Avoid multiple font sizes – use weight and color for emphasis:**

```tsx
// Incorrect – varying font sizes for hierarchy
<Text style={{ fontSize: 18 }}>Title</Text>
<Text style={{ fontSize: 14 }}>Subtitle</Text>
<Text style={{ fontSize: 12 }}>Caption</Text>

// Correct – consistent size, vary weight and color
<Text style={{ fontWeight: '600' }}>Title</Text>
<Text style={{ color: '#666' }}>Subtitle</Text>
<Text style={{ color: '#999' }}>Caption</Text>
```

Limiting font sizes creates visual consistency. Use `fontWeight` (bold/semibold)
and grayscale colors for hierarchy instead.

> **Mức độ:** `MEDIUM` | **Thẻ:** `styling, css, layout, shadows, gradients`

---

<a id="design-system"></a>

# 11. Design System Architecture
**Mức độ ưu tiên:** `MEDIUM`

---

<a id="design-system-compound-components"></a>

## Use Compound Components Over Polymorphic Children

Don't create components that can accept a string if they aren't a text node. If
a component can receive a string child, it must be a dedicated `*Text`
component. For components like buttons, which can have both a View (or
Pressable) together with text, use compound components, such a `Button`,
`ButtonText`, and `ButtonIcon`.

**Incorrect (polymorphic children):**

```tsx
import { Pressable, Text } from 'react-native'

type ButtonProps = {
  children: string | React.ReactNode
  icon?: React.ReactNode
}

function Button({ children, icon }: ButtonProps) {
  return (
    <Pressable>
      {icon}
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Pressable>
  )
}

// Usage is ambiguous
<Button icon={<Icon />}>Save</Button>
<Button><CustomText>Save</CustomText></Button>
```

**Correct (compound components):**

```tsx
import { Pressable, Text } from 'react-native'

function Button({ children }: { children: React.ReactNode }) {
  return <Pressable>{children}</Pressable>
}

function ButtonText({ children }: { children: React.ReactNode }) {
  return <Text>{children}</Text>
}

function ButtonIcon({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Usage is explicit and composable
<Button>
  <ButtonIcon><SaveIcon /></ButtonIcon>
  <ButtonText>Save</ButtonText>
</Button>

<Button>
  <ButtonText>Cancel</ButtonText>
</Button>
```

> **Mức độ:** `MEDIUM` | **Thẻ:** `design-system, components, composition`

---

<a id="monorepo"></a>

# 12. Monorepo & Native Dependencies
**Mức độ ưu tiên:** `LOW`

---

<a id="monorepo-native-deps-in-app"></a>

## Install Native Dependencies in App Directory

In a monorepo, packages with native code must be installed in the native app's
directory directly. Autolinking only scans the app's `node_modules`—it won't
find native dependencies installed in other packages.

**Incorrect (native dep in shared package only):**

```
packages/
  ui/
    package.json  # has react-native-reanimated
  app/
    package.json  # missing react-native-reanimated
```

Autolinking fails—native code not linked.

**Correct (native dep in app directory):**

```
packages/
  ui/
    package.json  # has react-native-reanimated
  app/
    package.json  # also has react-native-reanimated
```

```json
// packages/app/package.json
{
  "dependencies": {
    "react-native-reanimated": "3.16.1"
  }
}
```

Even if the shared package uses the native dependency, the app must also list it
for autolinking to detect and link the native code.

> **Mức độ:** `CRITICAL` | **Thẻ:** `monorepo, native, autolinking, installation`

---

<a id="monorepo-single-dependency-versions"></a>

## Use Single Dependency Versions Across Monorepo

Use a single version of each dependency across all packages in your monorepo.
Prefer exact versions over ranges. Multiple versions cause duplicate code in
bundles, runtime conflicts, and inconsistent behavior across packages.

Use a tool like syncpack to enforce this. As a last resort, use yarn resolutions
or npm overrides.

**Incorrect (version ranges, multiple versions):**

```json
// packages/app/package.json
{
  "dependencies": {
    "react-native-reanimated": "^3.0.0"
  }
}

// packages/ui/package.json
{
  "dependencies": {
    "react-native-reanimated": "^3.5.0"
  }
}
```

**Correct (exact versions, single source of truth):**

```json
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "react-native-reanimated": "3.16.1"
    }
  }
}

// packages/app/package.json
{
  "dependencies": {
    "react-native-reanimated": "3.16.1"
  }
}

// packages/ui/package.json
{
  "dependencies": {
    "react-native-reanimated": "3.16.1"
  }
}
```

Use your package manager's override/resolution feature to enforce versions at
the root. When adding dependencies, specify exact versions without `^` or `~`.

> **Mức độ:** `MEDIUM` | **Thẻ:** `monorepo, dependencies, installation`

---

<a id="imports"></a>

# 13. Dependencies & Module Wrappers
**Mức độ ưu tiên:** `LOW`

---

<a id="imports-design-system-folder"></a>

## Import from Design System Folder

Re-export dependencies from a design system folder. App code imports from there,
not directly from packages. This enables global changes and easy refactoring.

**Incorrect (imports directly from package):**

```tsx
import { View, Text } from 'react-native'
import { Button } from '@ui/button'

function Profile() {
  return (
    <View>
      <Text>Hello</Text>
      <Button>Save</Button>
    </View>
  )
}
```

**Correct (imports from design system):**

```tsx
// components/view.tsx
import { View as RNView } from 'react-native'

// ideal: pick the props you will actually use to control implementation
export function View(
  props: Pick<React.ComponentProps<typeof RNView>, 'style' | 'children'>
) {
  return <RNView {...props} />
}
```

```tsx
// components/text.tsx
export { Text } from 'react-native'
```

```tsx
// components/button.tsx
export { Button } from '@ui/button'
```

```tsx
import { View } from '@/components/view'
import { Text } from '@/components/text'
import { Button } from '@/components/button'

function Profile() {
  return (
    <View>
      <Text>Hello</Text>
      <Button>Save</Button>
    </View>
  )
}
```

Start by simply re-exporting. Customize later without changing app code.

> **Mức độ:** `LOW` | **Thẻ:** `imports, architecture, design-system`

---

<a id="js"></a>

# 14. JavaScript Micro-Optimizations
**Mức độ ưu tiên:** `LOW`

---

<a id="js-hoist-intl"></a>

## Hoist Intl Formatter Creation

Don't create `Intl.DateTimeFormat`, `Intl.NumberFormat`, or
`Intl.RelativeTimeFormat` inside render or loops. These are expensive to
instantiate. Hoist to module scope when the locale/options are static.

**Incorrect (new formatter every render):**

```tsx
function Price({ amount }: { amount: number }) {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  })
  return <Text>{formatter.format(amount)}</Text>
}
```

**Correct (hoisted to module scope):**

```tsx
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function Price({ amount }: { amount: number }) {
  return <Text>{currencyFormatter.format(amount)}</Text>
}
```

**For dynamic locales, memoize:**

```tsx
const dateFormatter = useMemo(
  () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
  [locale]
)
```

**Common formatters to hoist:**

```tsx
// Module-level formatters
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' })
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent' })
const relativeFormatter = new Intl.RelativeTimeFormat('en-US', {
  numeric: 'auto',
})
```

Creating `Intl` objects is significantly more expensive than `RegExp` or plain
objects—each instantiation parses locale data and builds internal lookup tables.

> **Mức độ:** `LOW-MEDIUM` | **Thẻ:** `javascript, intl, optimization, memoization`

---

<a id="fonts"></a>

# 15. Typography & Font Loading
**Mức độ ưu tiên:** `LOW`

---

<a id="fonts-config-plugin"></a>

## Use Expo Config Plugin for Font Loading

Use the `expo-font` config plugin to embed fonts at build time instead of
`useFonts` or `Font.loadAsync`. Embedded fonts are more efficient.

**Incorrect (async font loading):**

```tsx
import { useFonts } from 'expo-font'
import { Text, View } from 'react-native'

function App() {
  const [fontsLoaded] = useFonts({
    'Geist-Bold': require('./assets/fonts/Geist-Bold.otf'),
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <View>
      <Text style={{ fontFamily: 'Geist-Bold' }}>Hello</Text>
    </View>
  )
}
```

**Correct (config plugin, fonts embedded at build):**

```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/Geist-Bold.otf"]
        }
      ]
    ]
  }
}
```

```tsx
import { Text, View } from 'react-native'

function App() {
  // No loading state needed—font is already available
  return (
    <View>
      <Text style={{ fontFamily: 'Geist-Bold' }}>Hello</Text>
    </View>
  )
}
```

After adding fonts to the config plugin, run `npx expo prebuild` and rebuild the
native app.

Reference:
[Expo Font Documentation](https://docs.expo.dev/versions/latest/sdk/font/)

> **Mức độ:** `LOW` | **Thẻ:** `fonts, expo, performance, config-plugin`

---

