import React from 'react';
import { Box, Text } from 'ink';
import { THEME } from '../theme.js';

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <Box paddingX={1}>
      <Text backgroundColor={THEME.error} color="white" bold> ERROR </Text>
      <Text color={THEME.error}> {message}</Text>
    </Box>
  );
}
