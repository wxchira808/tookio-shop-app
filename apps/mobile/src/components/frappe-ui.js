import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, X } from "lucide-react-native";
import { colors, getThemeColor, radius, shadows, spacing, type } from "@/theme/frappeTheme";

export function Screen({ children, insets, scroll = false, contentStyle, style, refreshControl }) {
  const containerStyle = [
    styles.screen,
    insets ? { paddingTop: insets.top } : null,
    style,
  ];

  if (!scroll) {
    return <View style={containerStyle}>{children}</View>;
  }

  return (
    <View style={containerStyle}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[{ paddingBottom: (insets?.bottom || 0) + spacing.xl }, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function PageHeader({ title, left, right }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <Text style={type.pageTitle}>{title}</Text>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function Section({ label, children, style }) {
  return (
    <View style={[{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }, style]}>
      {label ? <Text style={[type.sectionLabel, { marginBottom: spacing.md }]}>{label}</Text> : null}
      {children}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppButton({ label, onPress, variant = "solid", theme = "blue", icon: Icon, disabled, style }) {
  const palette = getThemeColor(theme);
  const variantStyle = buttonStyles[variant] || buttonStyles.solid;
  const resolved = variantStyle(palette);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        resolved.container,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
        style,
      ]}
    >
      {Icon ? <Icon size={16} color={resolved.textColor} strokeWidth={1.8} /> : null}
      <Text style={[styles.buttonLabel, { color: resolved.textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, theme = "gray", size }) {
  const palette = getThemeColor(theme);
  const buttonSize = size || 34;
  const iconSize = size ? Math.round(size * 0.53) : 18;

  const isBlackTheme = theme === "black";
  const isClearTheme = theme === "clear";
  const bgNormal = isBlackTheme ? colors.inkGray9 : (isClearTheme ? "transparent" : colors.surfaceBase);
  const bgPressed = isBlackTheme ? colors.inkGray8 : (isClearTheme ? "rgba(0,0,0,0.05)" : palette.surface);
  const borderColor = isBlackTheme ? colors.inkGray9 : (isClearTheme ? "transparent" : colors.outlineGray2);
  const iconColor = isBlackTheme ? colors.inkWhite : (theme === "gray" || isClearTheme ? colors.inkGray7 : palette.text);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { 
          backgroundColor: pressed ? bgPressed : bgNormal, 
          borderColor: borderColor,
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
        },
      ]}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={1.9} />
    </Pressable>
  );
}

export function Badge({ label, theme = "gray" }) {
  const palette = getThemeColor(theme);
  return (
    <View style={[styles.badge, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function FilterChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active ? styles.filterChipActive : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function StatTile({ label, value, meta, theme = "gray", compact = false }) {
  const palette = getThemeColor(theme);
  return (
    <Card style={[styles.statTile, compact ? styles.statTileCompact : null]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={compact ? styles.statCompactValue : type.stat}>{value}</Text>
      {meta ? <Text style={[type.bodyMuted, { color: palette.text }]}>{meta}</Text> : null}
    </Card>
  );
}

export function ListRow({ title, subtitle, badge, onPress, rightLabel }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, pressed ? styles.buttonPressed : null]}>
      <View style={styles.listRowCopy}>
        <Text style={styles.listRowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listRowSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge || rightLabel ? (
        <View style={styles.listRowRight}>
          {rightLabel ? <Text style={styles.listRowMeta}>{rightLabel}</Text> : null}
          {badge}
          <ChevronRight size={16} color={colors.inkGray4} strokeWidth={1.9} />
        </View>
      ) : (
        <ChevronRight size={16} color={colors.inkGray4} strokeWidth={1.9} />
      )}
    </Pressable>
  );
}

export function ModuleTile({ title, subtitle, icon: Icon, theme = "gray", onPress }) {
  const palette = getThemeColor(theme);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.moduleTile,
        { borderColor: palette.border, backgroundColor: palette.surface },
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <View style={[styles.moduleIcon, { backgroundColor: colors.surfaceBase, borderColor: palette.border }]}>
        <Icon size={18} color={palette.text} strokeWidth={1.9} />
      </View>
      <Text style={styles.moduleTitle}>{title}</Text>
      {subtitle ? <Text style={styles.moduleSubtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  right,
  multiline,
  editable = true,
  autoCapitalize,
  helperText,
  inputStyle,
  containerStyle,
  selectTextOnFocus,
}) {
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={[type.label, { marginBottom: spacing.sm }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          multiline ? styles.inputShellMultiline : null,
          !editable ? styles.inputShellDisabled : null,
        ]}
      >
        <TextInput
          style={[styles.input, multiline ? styles.inputMultiline : null, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkGray4}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          autoCapitalize={autoCapitalize}
          selectTextOnFocus={selectTextOnFocus}
        />
        {right ? <View style={styles.fieldRight}>{right}</View> : null}
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

export function SelectField({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = "Select one",
  helperText,
  editable = true,
  containerStyle,
}) {
  const [modalVisible, setModalVisible] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.field, containerStyle]}>
        {label ? <Text style={[type.label, { marginBottom: spacing.sm }]}>{label}</Text> : null}
        <Pressable
          disabled={!editable}
          onPress={() => setModalVisible(true)}
          style={[
            styles.selectShell,
            !editable ? styles.inputShellDisabled : null,
            {
              paddingHorizontal: spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              height: 40,
            },
          ]}
        >
          <Text style={{ fontSize: 14, color: selectedOption ? colors.inkGray8 : colors.inkGray4 }}>
            {displayLabel}
          </Text>
          <View style={{ transform: [{ rotate: "90deg" }] }}>
            <ChevronRight size={16} color={colors.inkGray5} />
          </View>
        </Pressable>
        {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => setModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 40,
                maxHeight: "60%",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.outlineGray1,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.inkGray8 }}>
                  {label || placeholder}
                </Text>
                <Pressable onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                  <X size={20} color={colors.inkGray5} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={true} style={{ marginVertical: 8 }}>
                <Pressable
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F1F5F9",
                  }}
                  onPress={() => {
                    onValueChange("");
                    setModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 15, color: colors.inkGray4 }}>
                    {placeholder}
                  </Text>
                </Pressable>

                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      style={{
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: "#F1F5F9",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onPress={() => {
                        onValueChange(option.value);
                        setModalVisible(false);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: isSelected ? "600" : "400",
                          color: isSelected ? "#2E69FF" : colors.inkGray8,
                        }}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2E69FF" }} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={[type.label, { marginBottom: spacing.sm }]}>{label}</Text> : null}
      <View style={[styles.selectShell, !editable ? styles.inputShellDisabled : null]}>
        <Picker
          enabled={editable}
          selectedValue={value}
          onValueChange={onValueChange}
          style={styles.select}
          itemStyle={styles.selectItem}
          dropdownIconColor={colors.inkGray5}
        >
          <Picker.Item label={placeholder} value="" color={colors.inkGray4} />
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
              color={colors.inkGray8}
            />
          ))}
        </Picker>
      </View>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

export function EmptyState({ title, description }) {
  return (
    <Card style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Card>
  );
}

export function BottomSheet({ visible, onClose, title, children, insets }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, { paddingBottom: (insets?.bottom || 0) + spacing.lg }]}>
          <View style={styles.sheetHeader}>
            <Text style={type.cardTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <X size={18} color={colors.inkGray5} strokeWidth={1.9} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function FormSheet({
  visible,
  onClose,
  title,
  insets,
  children,
  footer,
  scroll = true,
  height,
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.sheetContent}
      showsVerticalScrollIndicator={true}
      persistentScrollbar={true}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
    >
      {children}
      {footer ? (
        <View style={{ marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.outlineGray1, paddingTop: spacing.md }}>
          {footer}
        </View>
      ) : null}
    </ScrollView>
  ) : (
    <View style={styles.sheetContent}>
      {children}
      {footer ? (
        <View style={{ marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.outlineGray1, paddingTop: spacing.md }}>
          {footer}
        </View>
      ) : null}
    </View>
  );

  const bottomInset = insets?.bottom || 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={styles.sheetKeyboard}>
          <View style={[
            styles.sheet, 
            styles.formSheet, 
            height ? { maxHeight: height, height: height } : null,
            { paddingBottom: bottomInset + spacing.md }
          ]}>
            <View style={styles.sheetHeader}>
              <Text style={type.cardTitle}>{title}</Text>
              <Pressable onPress={onClose} style={styles.sheetClose}>
                <X size={18} color={colors.inkGray5} strokeWidth={1.9} />
              </Pressable>
            </View>
            {body}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const buttonStyles = {
  solid: (palette) => ({
    container: {
      backgroundColor: palette.text === colors.inkGray7 ? colors.inkGray8 : palette.text,
      borderColor: palette.text === colors.inkGray7 ? colors.inkGray8 : palette.text,
    },
    textColor: colors.inkWhite,
  }),
  outline: (palette) => ({
    container: { backgroundColor: colors.surfaceBase, borderColor: palette.border },
    textColor: palette.text,
  }),
  subtle: (palette) => ({
    container: { backgroundColor: palette.surface, borderColor: palette.surface },
    textColor: palette.text,
  }),
  ghost: (palette) => ({
    container: { backgroundColor: colors.surfaceBase, borderColor: colors.surfaceBase },
    textColor: palette.text,
  }),
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surfaceBase },
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineGray1,
    backgroundColor: colors.surfaceBase,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: { width: 72, justifyContent: "center" },
  headerRight: { alignItems: "flex-end" },
  card: {
    backgroundColor: colors.surfaceBase,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineGray1,
    ...shadows.card,
  },
  button: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  buttonLabel: { fontSize: 14, fontWeight: "500" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.88 },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 12, fontWeight: "500" },
  filterChip: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineGray2,
    backgroundColor: colors.surfaceBase,
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.surfaceGray1,
    borderColor: colors.outlineGray3,
  },
  filterChipText: { fontSize: 13, color: colors.inkGray6, fontWeight: "500" },
  filterChipTextActive: { color: colors.inkGray8 },
  statTile: { padding: spacing.lg, gap: spacing.sm },
  statTileCompact: { padding: spacing.md },
  statLabel: { fontSize: 12, fontWeight: "500", color: colors.inkGray5 },
  statCompactValue: { fontSize: 22, fontWeight: "600", color: colors.inkGray9 },
  listRow: {
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineGray1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceBase,
  },
  listRowCopy: { flex: 1, paddingRight: spacing.md },
  listRowTitle: { fontSize: 14, fontWeight: "500", color: colors.inkGray8 },
  listRowSubtitle: { marginTop: 2, fontSize: 12, color: colors.inkGray5 },
  listRowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  listRowMeta: { fontSize: 12, color: colors.inkGray5 },
  moduleTile: {
    flex: 1,
    minWidth: 132,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  moduleIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: { fontSize: 14, fontWeight: "600", color: colors.inkGray8 },
  moduleSubtitle: { fontSize: 12, color: colors.inkGray5, lineHeight: 17 },
  field: { marginBottom: spacing.lg },
  inputShell: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.outlineGray2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceBase,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  inputShellDisabled: {
    backgroundColor: colors.surfaceGray1,
  },
  inputShellMultiline: { alignItems: "flex-start", paddingTop: spacing.md },
  input: { flex: 1, fontSize: 14, color: colors.inkGray8, paddingVertical: 0 },
  inputMultiline: { minHeight: 92, textAlignVertical: "top" },
  fieldRight: { marginLeft: spacing.sm },
  selectShell: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.outlineGray2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceBase,
    overflow: "hidden",
    justifyContent: "center",
  },
  select: { width: "100%", height: 40, color: colors.inkGray8 },
  selectItem: { fontSize: 14, color: colors.inkGray8 },
  helperText: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.inkGray5,
    lineHeight: 17,
  },
  emptyState: { padding: spacing.xxl, alignItems: "center", gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.inkGray8 },
  emptyDescription: { fontSize: 13, color: colors.inkGray5, textAlign: "center", lineHeight: 19 },
  sheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceBase,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: "88%",
  },
  formSheet: {
    maxHeight: "90%",
  },
  sheetKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContent: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    minHeight: 56,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineGray1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetClose: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetFooter: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineGray1,
    backgroundColor: colors.surfaceBase,
  },
});
