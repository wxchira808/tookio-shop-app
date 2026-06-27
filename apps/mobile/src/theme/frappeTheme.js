export const colors = {
  surfaceBase: "#FFFFFF",
  surfaceSidebar: "#F7F7F7",
  surfaceGray1: "#F5F5F5",
  surfaceGray2: "#EFEFEF",
  surfaceGray3: "#E7E7E7",
  surfaceGray4: "#D8D8D8",
  surfaceElevation1: "#FCFCFC",
  surfaceElevation2: "#F9F9F9",
  inkWhite: "#FFFFFF",
  inkGray4: "#8F8F8F",
  inkGray5: "#707070",
  inkGray6: "#525252",
  inkGray7: "#3A3A3A",
  inkGray8: "#242424",
  inkGray9: "#171717",
  outlineGray1: "#EDEDED",
  outlineGray2: "#E2E2E2",
  outlineGray3: "#D0D0D0",
  outlineGray4: "#B8B8B8",
  outlineGray6: "#7D7D7D",
  blue: "#2E69FF",
  blueSoft: "#EAF0FF",
  green: "#1C7C45",
  greenSoft: "#EAF7EF",
  red: "#C73A3A",
  redSoft: "#FDEEEE",
  amber: "#A35F00",
  amberSoft: "#FFF6E4",
  focusRing: "#D0D0D0",
  overlay: "rgba(23, 23, 23, 0.24)",
};

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const type = {
  pageTitle: { fontSize: 20, fontWeight: "600", color: colors.inkGray8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkGray5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.inkGray8 },
  body: { fontSize: 14, color: colors.inkGray7 },
  bodyMuted: { fontSize: 13, color: colors.inkGray5 },
  label: { fontSize: 13, fontWeight: "500", color: colors.inkGray7 },
  stat: { fontSize: 28, fontWeight: "600", color: colors.inkGray9 },
};

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
};

export function getThemeColor(theme = "gray") {
  switch (theme) {
    case "blue":
      return { text: colors.blue, surface: colors.blueSoft, border: "#C9D7FF" };
    case "green":
      return { text: colors.green, surface: colors.greenSoft, border: "#CDE7D6" };
    case "red":
      return { text: colors.red, surface: colors.redSoft, border: "#F3CFCF" };
    case "amber":
      return { text: colors.amber, surface: colors.amberSoft, border: "#F1D8AA" };
    default:
      return { text: colors.inkGray7, surface: colors.surfaceGray1, border: colors.outlineGray2 };
  }
}

