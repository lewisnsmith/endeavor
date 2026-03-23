import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { THEME } from '../theme.js';

const TOTAL_FRAMES = 20;
const INTERVAL_MS = 150;
const DISPLAY_ROWS = 14;

const SHUTTLE_LINES = [
  '    /\\    ',
  '   /  \\   ',
  '  | ✻  |  ',
  '  |    |  ',
  '  /|  |\\  ',
  ' / |  | \\ ',
  '   ||||   ',
];
const SHUTTLE_HEIGHT = SHUTTLE_LINES.length; // 7

// Shuttle starts at this row (bottom), rises to row 0 (top)
const SHUTTLE_START_ROW = DISPLAY_ROWS - SHUTTLE_HEIGHT - 1; // 6

const FLAMES = ['  /~~~~\\  ', ' /~~~~~~\\ '];

const STAR_ROWS = [
  '  *    ·    .   *    .  ·   *  .  ·  ',
  '·    *    .    *    ·    .    *    .  ',
  '   .    ·   *    .    *    .    ·   *',
  '*    .    *    ·    *    .    ·    . ',
  '  ·    *   .    ·    *   .    *    ·',
  '.    ·    *    .    ·    *    .    · ',
  '  *   .    ·    *    .   ·    *   .  ',
  '·    *    .    *    ·    .    *    . ',
  '   .    ·   *    .    *    .    ·   ',
  '*    .    *    ·    *    .    ·    . ',
  '  ·    *   .    ·    *   .    *     ',
  '.    ·    *    .    ·    *    .    ·.',
  '  *   .    ·    *    .   ·    *   .  ',
  '·    *    .    *    ·    .    *    . ',
];

function centerLine(s: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return ' '.repeat(pad) + s;
}

function tileRow(pattern: string, width: number): string {
  let result = '';
  while (result.length < width) result += pattern;
  return result.slice(0, width);
}

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [frame, setFrame] = useState(0);
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const doneCalled = useRef(false);

  const callDone = useCallback(() => {
    if (!doneCalled.current) {
      doneCalled.current = true;
      onDone();
    }
  }, [onDone]);

  useInput(() => {
    callDone();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => f + 1);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (frame >= TOTAL_FRAMES) {
      callDone();
    }
  }, [frame, callDone]);

  // Shuttle rises from SHUTTLE_START_ROW → 0 over TOTAL_FRAMES
  const shuttleTopRow = Math.max(
    0,
    Math.round(SHUTTLE_START_ROW * (1 - frame / (TOTAL_FRAMES - 1))),
  );
  const flameRow = shuttleTopRow + SHUTTLE_HEIGHT;
  const flame = FLAMES[frame % 2];

  const showPhrase2 = frame >= 7;
  const showPhrase3 = frame >= 14;

  return (
    <Box flexDirection="column" width={termWidth}>
      {/* Animation area */}
      {Array.from({ length: DISPLAY_ROWS }, (_, row) => {
        const shuttleLineIdx = row - shuttleTopRow;

        if (shuttleLineIdx >= 0 && shuttleLineIdx < SHUTTLE_HEIGHT) {
          return (
            <Text key={row}>
              {centerLine(SHUTTLE_LINES[shuttleLineIdx], termWidth)}
            </Text>
          );
        }

        if (row === flameRow) {
          return (
            <Text key={row} color={THEME.accent}>
              {centerLine(flame, termWidth)}
            </Text>
          );
        }

        return (
          <Text key={row} color={THEME.textMuted}>
            {tileRow(STAR_ROWS[row % STAR_ROWS.length], termWidth)}
          </Text>
        );
      })}

      {/* Phrase area */}
      <Box flexDirection="column" marginTop={1}>
        <Box justifyContent="center">
          <Text color={THEME.textDim}>ignition sequence start.</Text>
        </Box>
        <Box justifyContent="center">
          <Text color={THEME.text}>{showPhrase2 ? 'the observatory awakens.' : ' '}</Text>
        </Box>
        <Box justifyContent="center">
          <Text color={THEME.accent} bold>{showPhrase3 ? 'endeavor online —' : ' '}</Text>
        </Box>
      </Box>
    </Box>
  );
}
