import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, TextStyle } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  wrapperStyle?: ViewStyle;
  error?: string;
  prefix?: string;
  variant?: 'filled' | 'underline';
}

export const Input: React.FC<InputProps> = ({
  label,
  containerStyle,
  inputStyle,
  wrapperStyle,
  error,
  prefix,
  variant = 'filled',
  multiline,
  numberOfLines,
  ...props
}) => {
  const isUnderline = variant === 'underline';

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={[styles.label, isUnderline && styles.underlineLabel]}>{label}</Text>}
      <View style={[
        isUnderline ? styles.underlineWrapper : styles.inputWrapper,
        multiline ? (isUnderline ? styles.multilineUnderlineWrapper : styles.multilineWrapper) : null,
        error ? (isUnderline ? styles.errorUnderlineWrapper : styles.errorInputWrapper) : null,
        wrapperStyle
      ]}>
        {!!prefix && (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, multiline ? styles.multilineInput : null, inputStyle]}
          placeholderTextColor="#B0ADA8"
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#7A756E',
    textTransform: 'uppercase',
    letterSpacing: 0.04,
    marginBottom: 8,
  },
  underlineLabel: {
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F2EF',
    borderRadius: 28,
    height: 56,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  multilineWrapper: {
    height: 120,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  errorInputWrapper: {
    borderColor: '#BA1A1A',
  },
  underlineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    height: 44,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E4E1DC',
  },
  multilineUnderlineWrapper: {
    height: 100,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  errorUnderlineWrapper: {
    borderBottomColor: '#BA1A1A',
  },
  prefixContainer: {
    marginRight: 8,
    justifyContent: 'center',
  },
  prefixText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#0C0C0D',
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400',
    color: '#0C0C0D',
  },
  multilineInput: {
    height: '100%',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#BA1A1A',
    marginTop: 4,
    marginLeft: 12,
  },
});
