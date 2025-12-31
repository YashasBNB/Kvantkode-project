/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { getHashedRemotesFromConfig as baseGetHashedRemotesFromConfig } from '../../common/workspaceTags.js';
function hash(value) {
    return crypto.createHash('sha256').update(value.toString()).digest('hex');
}
async function asyncHash(value) {
    return hash(value);
}
export async function getHashedRemotesFromConfig(text, stripEndingDotGit = false) {
    return baseGetHashedRemotesFromConfig(text, stripEndingDotGit, (remote) => asyncHash(remote));
}
suite('Telemetry - WorkspaceTags', () => {
    test('Single remote hashed', async function () {
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git')), [hash('github3.com/username/repository.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git')), [hash('git.server.org/project.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git')), [hash('git.server.org/project.git')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git')), []);
        // Strip .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git'), true), [hash('github3.com/username/repository')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), []);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository.git'), true), await getHashedRemotesFromConfig(remote('https://username:password@github3.com/username/repository')));
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project.git'), true), await getHashedRemotesFromConfig(remote('ssh://user@git.server.org/project')));
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('user@git.server.org:project.git'), true), [hash('git.server.org/project')]);
        assert.deepStrictEqual(await getHashedRemotesFromConfig(remote('/opt/git/project.git'), true), await getHashedRemotesFromConfig(remote('/opt/git/project')));
    });
    test('Multiple remotes hashed', async function () {
        const config = [
            'https://github.com/microsoft/vscode.git',
            'https://git.example.com/gitproject.git',
        ]
            .map(remote)
            .join(' ');
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config), [
            hash('github.com/microsoft/vscode.git'),
            hash('git.example.com/gitproject.git'),
        ]);
        // Strip .git
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config, true), [
            hash('github.com/microsoft/vscode'),
            hash('git.example.com/gitproject'),
        ]);
        // Compare Striped .git with no .git
        const noDotGitConfig = [
            'https://github.com/microsoft/vscode',
            'https://git.example.com/gitproject',
        ]
            .map(remote)
            .join(' ');
        assert.deepStrictEqual(await getHashedRemotesFromConfig(config, true), await getHashedRemotesFromConfig(noDotGitConfig));
    });
    function remote(url) {
        return `[remote "origin"]
	url = ${url}
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGFncy90ZXN0L25vZGUvd29ya3NwYWNlVGFncy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsMEJBQTBCLElBQUksOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU1RyxTQUFTLElBQUksQ0FBQyxLQUFhO0lBQzFCLE9BQU8sTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzFFLENBQUM7QUFFRCxLQUFLLFVBQVUsU0FBUyxDQUFDLEtBQWE7SUFDckMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDbkIsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsMEJBQTBCLENBQy9DLElBQVksRUFDWixvQkFBNkIsS0FBSztJQUVsQyxPQUFPLDhCQUE4QixDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDOUYsQ0FBQztBQUVELEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUs7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSwwQkFBMEIsQ0FDL0IsTUFBTSxD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