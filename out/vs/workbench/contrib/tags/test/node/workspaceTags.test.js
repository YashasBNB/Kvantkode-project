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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlVGFncy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YWdzL3Rlc3Qvbm9kZS93b3Jrc3BhY2VUYWdzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwwQkFBMEIsSUFBSSw4QkFBOEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVHLFNBQVMsSUFBSSxDQUFDLEtBQWE7SUFDMUIsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDMUUsQ0FBQztBQUVELEtBQUssVUFBVSxTQUFTLENBQUMsS0FBYTtJQUNyQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNuQixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSwwQkFBMEIsQ0FDL0MsSUFBWSxFQUNaLG9CQUE2QixLQUFLO0lBRWxDLE9BQU8sOEJBQThCLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM5RixDQUFDO0FBRUQsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2QyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSztRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUMvQixNQUFNLENBQUMsK0RBQStELENBQUMsQ0FDdkUsRUFDRCxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQzdDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLEVBQ2pGLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FDcEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLENBQUMsRUFDM0UsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUNwQyxDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFNUYsYUFBYTtRQUNiLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sMEJBQTBCLENBQy9CLE1BQU0sQ0FBQywrREFBK0QsQ0FBQyxFQUN2RSxJQUFJLENBQ0osRUFDRCxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQ3pDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyx1Q0FBdUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUN2RixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQ2hDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUNqRixDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQ2hDLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUN0RSxFQUFFLENBQ0YsQ0FBQTtRQUVELG9DQUFvQztRQUNwQyxNQUFNLENBQUMsZUFBZSxDQUNyQixNQUFNLDBCQUEwQixDQUMvQixNQUFNLENBQUMsK0RBQStELENBQUMsRUFDdkUsSUFBSSxDQUNKLEVBQ0QsTUFBTSwwQkFBMEIsQ0FDL0IsTUFBTSxDQUFDLDJEQUEyRCxDQUFDLENBQ25FLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLHVDQUF1QyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ3ZGLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ2pGLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FDaEMsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQ3RFLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FDNUQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUs7UUFDcEMsTUFBTSxNQUFNLEdBQUc7WUFDZCx5Q0FBeUM7WUFDekMsd0NBQXdDO1NBQ3hDO2FBQ0MsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUNYLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNYLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSwwQkFBMEIsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNoRSxJQUFJLENBQUMsaUNBQWlDLENBQUM7WUFDdkMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDO1NBQ3RDLENBQUMsQ0FBQTtRQUVGLGFBQWE7UUFDYixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sMEJBQTBCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ3RFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQztZQUNuQyxJQUFJLENBQUMsNEJBQTRCLENBQUM7U0FDbEMsQ0FBQyxDQUFBO1FBRUYsb0NBQW9DO1FBQ3BDLE1BQU0sY0FBYyxHQUFHO1lBQ3RCLHFDQUFxQztZQUNyQyxvQ0FBb0M7U0FDcEM7YUFDQyxHQUFHLENBQUMsTUFBTSxDQUFDO2FBQ1gsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1gsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQzlDLE1BQU0sMEJBQTBCLENBQUMsY0FBYyxDQUFDLENBQ2hELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsTUFBTSxDQUFDLEdBQVc7UUFDMUIsT0FBTztTQUNBLEdBQUc7O0NBRVgsQ0FBQTtJQUNBLENBQUM7SUFFRCx1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=