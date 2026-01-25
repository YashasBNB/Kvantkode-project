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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnUmVtb3Rlcy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2NvbmZpZ1JlbW90ZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRS9FLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLGNBQWMsR0FBRztRQUN0QixZQUFZO1FBQ1osYUFBYTtRQUNiLGFBQWE7UUFDYixhQUFhO1FBQ2IsY0FBYztRQUNkLGNBQWM7UUFDZCxZQUFZO1FBQ1osYUFBYTtLQUNiLENBQUE7SUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUN0RixDQUFDLFlBQVksQ0FBQyxDQUNkLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsd0NBQXdDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFDckYsQ0FBQyxhQUFhLENBQUMsQ0FDZixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsbUJBQW1CLENBQ2xCLE1BQU0sQ0FBQyxzREFBc0QsQ0FBQyxFQUM5RCxjQUFjLENBQ2QsRUFDRCxDQUFDLGFBQWEsQ0FBQyxDQUNmLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixtQkFBbUIsQ0FDbEIsTUFBTSxDQUFDLCtEQUErRCxDQUFDLEVBQ3ZFLGNBQWMsQ0FDZCxFQUNELENBQUMsYUFBYSxDQUFDLENBQ2YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLG1CQUFtQixDQUNsQixNQUFNLENBQUMscUVBQXFFLENBQUMsRUFDN0UsY0FBYyxDQUNkLEVBQ0QsQ0FBQyxjQUFjLENBQUMsQ0FDaEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLG1CQUFtQixDQUNsQixNQUFNLENBQUMsbURBQW1ELENBQUMsRUFDM0QsY0FBYyxDQUNkLEVBQ0QsQ0FBQyxjQUFjLENBQUMsQ0FDaEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNuQixNQUFNLENBQUMsZUFBZSxDQUNyQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsdUNBQXVDLENBQUMsRUFBRSxjQUFjLENBQUMsRUFDcEYsQ0FBQyxZQUFZLENBQUMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUU7UUFDeEIsTUFBTSxDQUFDLGVBQWUsQ0FDckIsbUJBQW1CLENBQUMsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQ2xGLENBQUMsWUFBWSxDQUFDLENBQ2QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUM5RSxDQUFDLFlBQVksQ0FBQyxDQUNkLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsRUFBRSxjQUFjLENBQUMsRUFDMUUsQ0FBQyxhQUFhLENBQUMsQ0FDZixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLGVBQWUsQ0FDckIsbUJBQW1CLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQzFFLEVBQUUsQ0FDRixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0JBQWtCLEVBQUU7UUFDeEIsTUFBTSxNQUFNLEdBQUc7WUFDZCx5Q0FBeUM7WUFDekMsd0NBQXdDO1NBQ3hDO2FBQ0MsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNWLE1BQU0sQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzFFLGFBQWE7WUFDYixZQUFZO1NBQ1osQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sTUFBTSxHQUFHO1lBQ2QseUNBQXlDO1lBQ3pDLHVDQUF1QztTQUN2QzthQUNDLEdBQUcsQ0FBQyxNQUFNLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxRSxZQUFZO1lBQ1osWUFBWTtTQUNaLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBQ2xDLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLEVBQUU7WUFDckYsaUNBQWlDO1NBQ2pDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLEVBQUU7WUFDcEYsZ0NBQWdDO1NBQ2hDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsc0RBQXNELENBQUMsQ0FBQyxFQUMxRSxDQUFDLHFDQUFxQyxDQUFDLENBQ3ZDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLCtEQUErRCxDQUFDLENBQUMsRUFDbkYsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUN2QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDLEVBQ3pGLENBQUMsc0NBQXNDLENBQUMsQ0FDeEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsbURBQW1ELENBQUMsQ0FBQyxFQUN2RSxDQUFDLHNDQUFzQyxDQUFDLENBQ3hDLENBQUE7UUFFRCxhQUFhO1FBQ2IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHlDQUF5QyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDM0YsNkJBQTZCO1NBQzdCLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyx3Q0FBd0MsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQzFGLDRCQUE0QjtTQUM1QixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLHNEQUFzRCxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ2hGLENBQUMsaUNBQWlDLENBQUMsQ0FDbkMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsK0RBQStELENBQUMsRUFBRSxJQUFJLENBQUMsRUFDekYsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUNuQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUNULE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxFQUM3RSxJQUFJLENBQ0osRUFDRCxDQUFDLGtDQUFrQyxDQUFDLENBQ3BDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLG1EQUFtRCxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQzdFLENBQUMsa0NBQWtDLENBQUMsQ0FDcEMsQ0FBQTtRQUVELG9DQUFvQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLHlDQUF5QyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ25FLFVBQVUsQ0FBQyxNQUFNLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUN6RCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLE1BQU0sQ0FBQyx3Q0FBd0MsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUNsRSxVQUFVLENBQUMsTUFBTSxDQUFDLG9DQUFvQyxDQUFDLENBQUMsQ0FDeEQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsc0RBQXNELENBQUMsRUFBRSxJQUFJLENBQUMsRUFDaEYsVUFBVSxDQUFDLE1BQU0sQ0FBQyxrREFBa0QsQ0FBQyxDQUFDLENBQ3RFLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLCtEQUErRCxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ3pGLFVBQVUsQ0FBQyxNQUFNLENBQUMsMkRBQTJELENBQUMsQ0FBQyxDQUMvRSxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUNULE1BQU0sQ0FBQyxxRUFBcUUsQ0FBQyxFQUM3RSxJQUFJLENBQ0osRUFDRCxVQUFVLENBQUMsTUFBTSxDQUFDLGlFQUFpRSxDQUFDLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsbURBQW1ELENBQUMsRUFBRSxJQUFJLENBQUMsRUFDN0UsVUFBVSxDQUFDLE1BQU0sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLENBQ25FLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxFQUFFO1lBQ25GLDRCQUE0QjtTQUM1QixDQUFDLENBQUE7UUFFRixhQUFhO1FBQ2IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDekYsd0JBQXdCO1NBQ3hCLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ2pFLFVBQVUsQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUN2RCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLENBQUMsRUFBRTtZQUNqRixpQ0FBaUM7U0FDakMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsRUFBRTtZQUM3RSw0QkFBNEI7U0FDNUIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUMsRUFBRTtZQUN6RSw2QkFBNkI7U0FDN0IsQ0FBQyxDQUFBO1FBRUYsYUFBYTtRQUNiLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3ZGLDZCQUE2QjtTQUM3QixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNuRix3QkFBd0I7U0FDeEIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDL0UseUJBQXlCO1NBQ3pCLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUNyQixVQUFVLENBQUMsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQy9ELFVBQVUsQ0FBQyxNQUFNLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsVUFBVSxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUMzRCxVQUFVLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FDakQsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFVBQVUsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLENBQUMsRUFBRSxJQUFJLENBQUMsRUFDdkQsVUFBVSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQzdDLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtRQUNsQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDOUUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxNQUFNLEdBQUc7WUFDZCx5Q0FBeUM7WUFDekMsd0NBQXdDO1NBQ3hDO2FBQ0MsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzFDLGlDQUFpQztZQUNqQyxnQ0FBZ0M7U0FDaEMsQ0FBQyxDQUFBO1FBRUYsYUFBYTtRQUNiLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNoRCw2QkFBNkI7WUFDN0IsNEJBQTRCO1NBQzVCLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxNQUFNLGNBQWMsR0FBRztZQUN0QixxQ0FBcUM7WUFDckMsb0NBQW9DO1NBQ3BDO2FBQ0MsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsTUFBTSxDQUFDLEdBQVc7UUFDMUIsT0FBTztTQUNBLEdBQUc7O0NBRVgsQ0FBQTtJQUNBLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQSJ9