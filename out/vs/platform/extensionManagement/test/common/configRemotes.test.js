/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getDomainsOfRemotes, getRemotes } from '../../common/configRemotes.js';
suite('Config Remotes', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const allowedDomains = [
        'github.com',
        'github2.com',
        'github3.com',
        'example.com',
        'example2.com',
        'example3.com',
        'server.org',
        'server2.org',
    ];
    test('HTTPS remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://github.com/microsoft/vscode.git'), allowedDomains), ['github.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://git.example.com/gitproject.git'), allowedDomains), ['example.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username@github2.com/username/repository.git'), allowedDomains), ['github2.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username:password@github3.com/username/repository.git'), allowedDomains), ['github3.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), allowedDomains), ['example2.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('https://example3.com:1234/username/repository.git'), allowedDomains), ['example3.com']);
    });
    test('SSH remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('ssh://user@git.server.org/project.git'), allowedDomains), ['server.org']);
    });
    test('SCP-like remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('git@github.com:microsoft/vscode.git'), allowedDomains), ['github.com']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('user@git.server.org:project.git'), allowedDomains), ['server.org']);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('git.server2.org:project.git'), allowedDomains), ['server2.org']);
    });
    test('Local remotes', function () {
        assert.deepStrictEqual(getDomainsOfRemotes(remote('/opt/git/project.git'), allowedDomains), []);
        assert.deepStrictEqual(getDomainsOfRemotes(remote('file:///opt/git/project.git'), allowedDomains), []);
    });
    test('Multiple remotes', function () {
        const config = [
            'https://github.com/microsoft/vscode.git',
            'https://git.example.com/gitproject.git',
        ]
            .map(remote)
            .join('');
        assert.deepStrictEqual(getDomainsOfRemotes(config, allowedDomains).sort(), [
            'example.com',
            'github.com',
        ]);
    });
    test('Non allowed domains are anonymized', () => {
        const config = [
            'https://github.com/microsoft/vscode.git',
            'https://git.foobar.com/gitproject.git',
        ]
            .map(remote)
            .join('');
        assert.deepStrictEqual(getDomainsOfRemotes(config, allowedDomains).sort(), [
            'aaaaaa.aaa',
            'github.com',
        ]);
    });
    test('HTTPS remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git')), [
            'github.com/microsoft/vscode.git',
        ]);
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git')), [
            'git.example.com/gitproject.git',
        ]);
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git')), ['github2.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git')), ['github3.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git')), ['example2.com/username/repository.git']);
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git')), ['example3.com/username/repository.git']);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), [
            'github.com/microsoft/vscode',
        ]);
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git'), true), [
            'git.example.com/gitproject',
        ]);
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git'), true), ['github2.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git'), true), ['github3.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), true), ['example2.com/username/repository']);
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git'), true), ['example3.com/username/repository']);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('https://github.com/microsoft/vscode.git'), true), getRemotes(remote('https://github.com/microsoft/vscode')));
        assert.deepStrictEqual(getRemotes(remote('https://git.example.com/gitproject.git'), true), getRemotes(remote('https://git.example.com/gitproject')));
        assert.deepStrictEqual(getRemotes(remote('https://username@github2.com/username/repository.git'), true), getRemotes(remote('https://username@github2.com/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://username:password@github3.com/username/repository.git'), true), getRemotes(remote('https://username:password@github3.com/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://username:password@example2.com:1234/username/repository.git'), true), getRemotes(remote('https://username:password@example2.com:1234/username/repository')));
        assert.deepStrictEqual(getRemotes(remote('https://example3.com:1234/username/repository.git'), true), getRemotes(remote('https://example3.com:1234/username/repository')));
    });
    test('SSH remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git')), [
            'git.server.org/project.git',
        ]);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git'), true), [
            'git.server.org/project',
        ]);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('ssh://user@git.server.org/project.git'), true), getRemotes(remote('ssh://user@git.server.org/project')));
    });
    test('SCP-like remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git')), [
            'github.com/microsoft/vscode.git',
        ]);
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git')), [
            'git.server.org/project.git',
        ]);
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git')), [
            'git.server2.org/project.git',
        ]);
        // Strip .git
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), [
            'github.com/microsoft/vscode',
        ]);
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git'), true), [
            'git.server.org/project',
        ]);
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git'), true), [
            'git.server2.org/project',
        ]);
        // Compare Striped .git with no .git
        assert.deepStrictEqual(getRemotes(remote('git@github.com:microsoft/vscode.git'), true), getRemotes(remote('git@github.com:microsoft/vscode')));
        assert.deepStrictEqual(getRemotes(remote('user@git.server.org:project.git'), true), getRemotes(remote('user@git.server.org:project')));
        assert.deepStrictEqual(getRemotes(remote('git.server2.org:project.git'), true), getRemotes(remote('git.server2.org:project')));
    });
    test('Local remotes to be hashed', function () {
        assert.deepStrictEqual(getRemotes(remote('/opt/git/project.git')), []);
        assert.deepStrictEqual(getRemotes(remote('file:///opt/git/project.git')), []);
    });
    test('Multiple remotes to be hashed', function () {
        const config = [
            'https://github.com/microsoft/vscode.git',
            'https://git.example.com/gitproject.git',
        ]
            .map(remote)
            .join(' ');
        assert.deepStrictEqual(getRemotes(config), [
            'github.com/microsoft/vscode.git',
            'git.example.com/gitproject.git',
        ]);
        // Strip .git
        assert.deepStrictEqual(getRemotes(config, true), [
            'github.com/microsoft/vscode',
            'git.example.com/gitproject',
        ]);
        // Compare Striped .git with no .git
        const noDotGitConfig = [
            'https://github.com/microsoft/vscode',
            'https://git.example.com/gitproject',
        ]
            .map(remote)
            .join(' ');
        assert.deepStrictEqual(getRemotes(config, true), getRemotes(noDotGitConfig));
    });
    function remote(url) {
        return `[remote "origin"]
	url = ${url}
	fetch = +refs/heads/*:refs/remotes/origin/*
`;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2NvbW1vbi9jb25maWdSZW1vdGVzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvRSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxjQUFjLEdBQUc7UUFDdEIsWUFBWTtRQUNaLGFBQWE7UUFDYixhQUFhO1FBQ2IsYUFBYTtRQUNiLGNBQWM7UUFDZCxjQUFjO1FBQ2QsWUFBWTtRQUNaLGFBQWE7S0FDYixDQUFBO0lBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNyQixNQUFNLENBQUMsZUFBZSxDQUNyQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMseUNBQXlDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFDdEYsQ0FBQyxZQUFZLENBQUMsQ0FDZCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsbUJBQW1CLENBQUMsTUFBTSxDQUFDLHdDQUF3QyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQ3JGLENBQUMsYUFBYSxDQUFDLENBQ2YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLG1CQUFtQixDQUNsQixNQUFNLENBQUMsc0RBQXNELENBQUMsRUFDOUQsY0FBYyxDQUNkLEVBQ0QsQ0FBQyxhQUFhLENBQUMsQ0FDZixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsbUJB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