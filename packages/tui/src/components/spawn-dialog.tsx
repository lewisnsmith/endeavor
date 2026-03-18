import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface SpawnDialogProps {
  defaultCwd: string;
  onSpawn: (cwd: string, label: string, prompt: string) => void;
  onCancel: () => void;
}

type Field = 'cwd' | 'label' | 'prompt';

export function SpawnDialog({ defaultCwd, onSpawn, onCancel }: SpawnDialogProps) {
  const [field, setField] = useState<Field>('label');
  const [cwd, setCwd] = useState(defaultCwd);
  const [label, setLabel] = useState('');
  const [prompt, setPrompt] = useState('');

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    if (field === 'label') {
      setField('prompt');
    } else if (field === 'prompt') {
      if (prompt.trim()) {
        onSpawn(cwd, label || `session-${Date.now()}`, prompt.trim());
      }
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>New Session</Text>
      <Text dimColor>ESC to cancel</Text>
      <Box marginTop={1} />

      <Box>
        <Text>Directory: </Text>
        {field === 'cwd' ? (
          <TextInput value={cwd} onChange={setCwd} onSubmit={() => setField('label')} />
        ) : (
          <Text dimColor>{cwd}</Text>
        )}
      </Box>

      <Box>
        <Text>Label: </Text>
        {field === 'label' ? (
          <TextInput value={label} onChange={setLabel} onSubmit={handleSubmit} placeholder="(auto-generated)" />
        ) : (
          <Text dimColor>{label || '(auto)'}</Text>
        )}
      </Box>

      {(field === 'prompt') && (
        <Box>
          <Text>Task: </Text>
          <TextInput value={prompt} onChange={setPrompt} onSubmit={handleSubmit} />
        </Box>
      )}
    </Box>
  );
}
