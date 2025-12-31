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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZFNDTU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9lbGVjdHJvbi1tYWluL3ZvaWRTQ01NYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjtBQUUxRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSxJQUFJLElBQUksS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBUzdDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUU3Qix5RkFBeUY7QUFDekYsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFBO0FBQzVCLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQTtBQUV6QixNQUFNLEdBQUcsR0FBRyxLQUFLLEVBQUUsT0FBZSxFQUFFLElBQVksRUFBbUIsRUFBRTtJQUNwRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUNsRSxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDckIsQ0FBQyxDQUFBO0FBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLElBQVksRUFBRSxnQkFBeUIsRUFBc0IsRUFBRTtJQUN4RixNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDakQsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsc0JBQXNC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