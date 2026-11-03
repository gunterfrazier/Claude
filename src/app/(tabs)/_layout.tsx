import { Tabs } from "expo-router/js-tabs";

import { BookIcon, PathIcon, TreeTabIcon } from "@/components/icons";
import { colors, fonts } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber400,
        tabBarInactiveTintColor: colors.parchment300,
        tabBarStyle: { backgroundColor: colors.header, borderTopColor: "rgba(217,119,6,0.55)", borderTopWidth: 1 },
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Tree", tabBarIcon: ({ color, size }) => <TreeTabIcon color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="pathfinder"
        options={{ title: "Pathfinder", tabBarIcon: ({ color, size }) => <PathIcon color={color} size={size - 2} /> }}
      />
      <Tabs.Screen
        name="figures"
        options={{ title: "Figures", tabBarIcon: ({ color, size }) => <BookIcon color={color} size={size - 2} /> }}
      />
    </Tabs>
  );
}
