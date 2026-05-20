import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

export function Collapsible({
  children,
  title,
}: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen(v => !v)}
      >
        <ChevronRight
          size={18}
          style={{
            transform: [{ rotate: isOpen ? '90deg' : '0deg' }],
          }}
        />

        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>

      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
