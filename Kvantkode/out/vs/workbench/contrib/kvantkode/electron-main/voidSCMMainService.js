/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { promisify } from 'util';
import { exec as _exec } from 'child_process';
const exec = promisify(_exec);
//8000 and 10 were chosen after some experimentation on small-to-moderately sized changes
const MAX_DIFF_LENGTH = 8000;
const MAX_DIFF_FILES = 10;
const git = async (command, path) => {
    const { stdout, stderr } = await exec(`${command}`, { cwd: path });
    if (stderr) {
        throw new Error(stderr);
    }
    return stdout.trim();
};
const getNumStat = async (path, useStagedChanges) => {
    const staged = useStagedChanges ? '--staged' : '';
    const output = await git(`git diff --numstat ${staged}`, path);
    return output.split('\n').map((line) => {
        const [added, removed, file] = line.split('\t');
        return {
            file,
            added: parseInt(added, 10) || 0,
            removed: parseInt(removed, 10) || 0,
        };
    });
};
const getSampledDiff = async (file, path, useStagedChanges) => {
    const staged = useStagedChanges ? '--staged' : '';
    const diff = await git(`git diff --unified=0 --no-color ${staged} -- "${file}"`, path);
    return diff.slice(0, MAX_DIFF_LENGTH);
};
const hasStagedChanges = async (path) => {
    const output = await git('git diff --staged --name-only', path);
    return output.length > 0;
};
export class VoidSCMService {
    async gitStat(path) {
        const useStagedChanges = await hasStagedChanges(path);
        const staged = useStagedChanges ? '--staged' : '';
        return git(`git diff --stat ${staged}`, path);
    }
    async gitSampledDiffs(path) {
        const useStagedChanges = await hasStagedChanges(path);
        const numStatList = await getNumStat(path, useStagedChanges);
        const topFiles = numStatList
            .sort((a, b) => b.added + b.removed - (a.added + a.removed))
            .slice(0, MAX_DIFF_FILES);
        const diffs = await Promise.all(topFiles.map(async ({ file }) => ({
            file,
            diff: await getSampledDiff(file, path, useStagedChanges),
        })));
        return diffs.map(({ file, diff }) => `==== ${file} ====\n${diff}`).join('\n\n');
    }
    gitBranch(path) {
        return git('git branch --show-current', path);
    }
    gitLog(path) {
        return git('git log --pretty=format:"%h|%s|%ad" --date=short --no-merges -n 5', path);
    }
}
