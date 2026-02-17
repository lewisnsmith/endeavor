#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "help") {
  console.log("Endeavor CLI bootstrap");
  console.log("Available commands: help");
} else {
  console.log(`Unknown command: ${command}`);
  process.exitCode = 1;
}

