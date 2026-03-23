import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { THEME } from '../theme.js';

interface SpawnDialogProps {
  defaultCwd: string;
  onSpawn: (cwd: string, label: string, prompt: string) => void;
  onCancel: () => void;
}

type Step = 'project' | 'label' | 'prompt';

const GITHUB_DIR = join(homedir(), 'Documents', 'GitHub');

function listRepos(): string[] {
  try {
    return readdirSync(GITHUB_DIR)
      .filter((name) => {
        if (name.startsWith('.')) return false;
        try {
          return statSync(join(GITHUB_DIR, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
  } catch {
    return [];
  }
}

export function SpawnDialog({ defaultCwd, onSpawn, onCancel }: SpawnDialogProps) {
  const repos = useMemo(() => listRepos(), []);
  const [step, setStep] = useState<Step>('project');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState('');
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }

    if (step === 'project') {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(repos.length - 1, i + 1));
      }
      if (key.return && repos.length > 0) {
        setSelectedProject(repos[selectedIndex]);
        setStep('label');
      }
    }
  });

  const handleLabelSubmit = () => {
    setStep('prompt');
  };

  const handlePromptSubmit = (value: string) => {
    if (value.trim()) {
      const cwd = join(GITHUB_DIR, selectedProject);
      onSpawn(cwd, label || `session-${Date.now()}`, value.trim());
    }
  };

  // Visible window of repos (show ~10 at a time)
  const maxVisible = 10;
  const startIdx = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), repos.length - maxVisible));
  const visibleRepos = repos.slice(startIdx, startIdx + maxVisible);

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text color={THEME.accent} bold>{THEME.sparkle} </Text>
        <Text color={THEME.text} bold>New Session</Text>
      </Box>
      <Box marginTop={1} />

      {step === 'project' && (
        <>
          <Text color={THEME.textDim}>Select project:</Text>
          <Box marginTop={0} />
          {repos.length === 0 && (
            <Text color={THEME.textDim}>No repos found in ~/Documents/GitHub/</Text>
          )}
          {visibleRepos.map((repo, i) => {
            const actualIdx = startIdx + i;
            const isFocused = actualIdx === selectedIndex;
            return (
              <Box key={repo}>
                <Text color={isFocused ? THEME.accent : THEME.textMuted}>
                  {isFocused ? '▸ ' : '  '}
                </Text>
                <Text color={isFocused ? THEME.text : THEME.textDim} bold={isFocused}>
                  {repo}
                </Text>
              </Box>
            );
          })}
          {repos.length > maxVisible && (
            <Text color={THEME.textMuted}>  ({repos.length} repos)</Text>
          )}
          <Box marginTop={1}>
            <Text color={THEME.textMuted}>↑↓</Text><Text color={THEME.textDim}> navigate  </Text>
            <Text color={THEME.textMuted}>Enter</Text><Text color={THEME.textDim}> select  </Text>
            <Text color={THEME.textMuted}>ESC</Text><Text color={THEME.textDim}> cancel</Text>
          </Box>
        </>
      )}

      {step === 'label' && (
        <>
          <Box>
            <Text color={THEME.accent}>Project: </Text>
            <Text color={THEME.text} bold>{selectedProject}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={THEME.textDim}>Label: </Text>
            <TextInput value={label} onChange={setLabel} onSubmit={handleLabelSubmit} placeholder="(auto-generated)" />
          </Box>
        </>
      )}

      {step === 'prompt' && (
        <>
          <Box>
            <Text color={THEME.accent}>Project: </Text>
            <Text color={THEME.text} bold>{selectedProject}</Text>
          </Box>
          <Box>
            <Text color={THEME.textDim}>Label: </Text>
            <Text color={THEME.textDim}>{label || '(auto)'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={THEME.accent}>Task: </Text>
            <TextInput value={prompt} onChange={setPrompt} onSubmit={handlePromptSubmit} />
          </Box>
        </>
      )}
    </Box>
  );
}
