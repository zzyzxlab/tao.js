#!/usr/bin/env node

import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package names from package.json files
const packagesPath = path.resolve(__dirname, '../packages');
const packages = fs
  .readdirSync(packagesPath)
  .filter((file) => fs.statSync(path.join(packagesPath, file)).isDirectory())
  .map((dir) => {
    try {
      const packageJsonPath = path.join(packagesPath, dir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return {
        name: packageJson.name,
        value: packageJson.name,
      };
    } catch (error) {
      // Fallback to directory name if package.json is missing or invalid
      return {
        name: dir,
        value: dir,
      };
    }
  });

// Add examples
const examplesPath = path.resolve(__dirname, '../examples');
if (fs.existsSync(examplesPath)) {
  const examples = fs
    .readdirSync(examplesPath)
    .filter((file) => fs.statSync(path.join(examplesPath, file)).isDirectory())
    .map((dir) => {
      try {
        const packageJsonPath = path.join(examplesPath, dir, 'package.json');
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, 'utf8'),
        );
        return {
          name: packageJson.name,
          value: packageJson.name,
        };
      } catch (error) {
        // Fallback to directory name if package.json is missing or invalid
        return {
          name: dir,
          value: dir,
        };
      }
    });
  packages.push(...examples);
}

const questions = [
  {
    type: 'list',
    name: 'type',
    message: "Select the type of change that you're committing:",
    choices: [
      { value: 'feat', name: 'feat:     A new feature' },
      { value: 'fix', name: 'fix:      A bug fix' },
      { value: 'docs', name: 'docs:     Documentation only changes' },
      {
        value: 'style',
        name: 'style:    Changes that do not affect the meaning of the code',
      },
      {
        value: 'refactor',
        name: 'refactor: A code change that neither fixes a bug nor adds a feature',
      },
      {
        value: 'perf',
        name: 'perf:     A code change that improves performance',
      },
      {
        value: 'test',
        name: 'test:     Adding missing tests or correcting existing tests',
      },
      {
        value: 'build',
        name: 'build:    Changes that affect the build system or external dependencies',
      },
      {
        value: 'ci',
        name: 'ci:       Changes to our CI configuration files and scripts',
      },
      {
        value: 'chore',
        name: 'chore:    Other changes that dont modify src or test files',
      },
    ],
  },
  {
    type: 'input',
    name: 'scope',
    message: 'Denote the SCOPE of this change (optional):',
  },
  {
    type: 'input',
    name: 'subject',
    message: 'Write a SHORT, IMPERATIVE tense description of the change:',
    validate: (subject) => {
      if (subject.length === 0) {
        return 'Subject is required';
      }
      return true;
    },
  },
  {
    type: 'input',
    name: 'body',
    message:
      'Provide a LONGER description of the change (optional). Use "|" to break new line:',
  },
  {
    type: 'checkbox',
    name: 'packages',
    message:
      'Which packages does this change affect? (select with spacebar, confirm with enter)',
    choices: packages,
    pageSize: 15,
  },
  {
    type: 'input',
    name: 'issues',
    message:
      'List any GitHub issues CLOSED by this change (comma-separated numbers, e.g. "123, 456"):',
  },
  {
    type: 'input',
    name: 'breaking',
    message: 'List any BREAKING CHANGES (optional):',
  },
];

function formatCommitMessage(answers) {
  const scope = answers.scope;
  const head = scope
    ? `${answers.type}(${scope}): ${answers.subject}`
    : `${answers.type}: ${answers.subject}`;

  let body = answers.body ? answers.body.replace(/\|/g, '\n') : '';

  // Add affected packages to the body
  if (answers.packages && answers.packages.length > 0) {
    const packagesText = `\nAffected packages:\n${answers.packages.map((pkg) => `- ${pkg}`).join('\n')}`;
    body = body ? `${body}\n${packagesText}` : packagesText.trim();
  }

  // Add issues closed
  if (answers.issues && answers.issues.trim()) {
    const issueNumbers = answers.issues
      .split(',')
      .map((num) => num.trim())
      .filter((num) => num);
    if (issueNumbers.length > 0) {
      const issuesText = `\nISSUES CLOSED: ${issueNumbers.map((num) => `#${num}`).join(', ')}`;
      body = body ? `${body}\n${issuesText}` : issuesText.trim();
    }
  }

  // Add breaking changes
  if (answers.breaking) {
    const breakingText = `\nBREAKING CHANGE: ${answers.breaking}`;
    body = body ? `${body}\n${breakingText}` : breakingText.trim();
  }

  return body ? `${head}\n\n${body}` : head;
}

async function main() {
  try {
    const answers = await inquirer.prompt(questions);

    const commitMessage = formatCommitMessage(answers);

    // Show preview of commit message
    console.log('\n' + '='.repeat(80));
    console.log('COMMIT MESSAGE PREVIEW:');
    console.log('='.repeat(80));
    console.log(commitMessage);
    console.log('='.repeat(80));

    // Ask for final confirmation
    const { confirmCommit } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmCommit',
        message: 'Are you sure you want to proceed with this commit?',
        default: true,
      },
    ]);

    if (!confirmCommit) {
      console.log('Commit has been canceled.');
      process.exit(0);
    }

    // Write the commit message to the file that Git expects
    const commitMsgFile = process.env.GIT_INDEX_FILE
      ? path.join(__dirname, '../.git/COMMIT_EDITMSG')
      : process.argv[2] || path.join(__dirname, '../.git/COMMIT_EDITMSG');

    fs.writeFileSync(commitMsgFile, commitMessage);
    console.log('Commit message written successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
