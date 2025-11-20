import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.neutral.white,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: colors.primary.main,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error.main,
    borderWidth: 2,
  },
  button: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  buttonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.neutral[700],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: colors.neutral[600],
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  link: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error.main,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  shadow: {
    shadowColor: colors.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});