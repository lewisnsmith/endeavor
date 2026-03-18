#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { App } from './app.js';

const args = process.argv.slice(2);
const cwdFlag = args.indexOf('--cwd');
const cwd = cwdFlag >= 0 ? args[cwdFlag + 1] : process.cwd();
const attach = args.includes('--attach');

render(<App cwd={cwd} attach={attach} />);
