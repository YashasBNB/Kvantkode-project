/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IgnoreFile } from '../../common/ignoreFile.js';
function runAssert(input, ignoreFile, ignoreFileLocation, shouldMatch, traverse) {
    return (prefix) => {
        const isDir = input.endsWith('/');
        const rawInput = isDir ? input.slice(0, input.length - 1) : input;
        const matcher = new IgnoreFile(ignoreFile, prefix + ignoreFileLocation);
        if (traverse) {
            const traverses = matcher.isPathIncludedInTraversal(prefix + rawInput, isDir);
            if (shouldMatch) {
                assert(traverses, `${ignoreFileLocation}: ${ignoreFile} should traverse ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
            else {
                assert(!traverses, `${ignoreFileLocation}: ${ignoreFile} should not traverse ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
        }
        else {
            const ignores = matcher.isArbitraryPathIgnored(prefix + rawInput, isDir);
            if (shouldMatch) {
                assert(ignores, `${ignoreFileLocation}: ${ignoreFile} should ignore ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
            else {
                assert(!ignores, `${ignoreFileLocation}: ${ignoreFile} should not ignore ${isDir ? 'dir' : 'file'} ${prefix}${rawInput}`);
            }
        }
    };
}
function assertNoTraverses(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, false, true);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertTraverses(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, true, true);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertIgnoreMatch(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, true, false);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
function assertNoIgnoreMatch(ignoreFile, ignoreFileLocation, input) {
    const runWithPrefix = runAssert(input, ignoreFile, ignoreFileLocation, false, false);
    runWithPrefix('');
    runWithPrefix('/someFolder');
}
suite('Parsing .gitignore files', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('paths with trailing slashes do not match files', () => {
        const i = 'node_modules/\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/');
        assertNoIgnoreMatch(i, '/', '/inner/node_modules');
        assertIgnoreMatch(i, '/', '/inner/node_modules/');
    });
    test('parsing simple gitignore files', () => {
        let i = 'node_modules\nout\n';
        assertIgnoreMatch(i, '/', '/node_modules');
        assertNoTraverses(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertIgnoreMatch(i, '/', '/dir/node_modules');
        assertIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out');
        assertNoTraverses(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertIgnoreMatch(i, '/', '/dir/out');
        assertIgnoreMatch(i, '/', '/dir/out/file');
        i = '/node_modules\n/out\n';
        assertIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertNoIgnoreMatch(i, '/', '/dir/out');
        assertNoIgnoreMatch(i, '/', '/dir/out/file');
        i = 'node_modules/\nout/\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/file');
        assertIgnoreMatch(i, '/', '/dir/node_modules/');
        assertNoIgnoreMatch(i, '/', '/dir/node_modules');
        assertIgnoreMatch(i, '/', '/dir/node_modules/file');
        assertIgnoreMatch(i, '/', '/out/');
        assertNoIgnoreMatch(i, '/', '/out');
        assertIgnoreMatch(i, '/', '/out/file');
        assertNoIgnoreMatch(i, '/', '/dir/out');
        assertIgnoreMatch(i, '/', '/dir/out/');
        assertIgnoreMatch(i, '/', '/dir/out/file');
    });
    test('parsing files-in-folder exclude', () => {
        let i = 'node_modules/*\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertNoIgnoreMatch(i, '/', '/node_modules/');
        assertTraverses(i, '/', '/node_modules');
        assertTraverses(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertNoTraverses(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertIgnoreMatch(i, '/', '/node_modules/@types');
        assertNoTraverses(i, '/', '/node_modules/@types');
        i = 'node_modules/**/*\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertNoIgnoreMatch(i, '/', '/node_modules/');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertIgnoreMatch(i, '/', '/node_modules/@types');
    });
    test('parsing simple negations', () => {
        let i = 'node_modules/*\n!node_modules/@types\n';
        assertNoIgnoreMatch(i, '/', '/node_modules');
        assertTraverses(i, '/', '/node_modules');
        assertIgnoreMatch(i, '/', '/node_modules/something');
        assertNoTraverses(i, '/', '/node_modules/something');
        assertIgnoreMatch(i, '/', '/node_modules/something/else');
        assertNoIgnoreMatch(i, '/', '/node_modules/@types');
        assertTraverses(i, '/', '/node_modules/@types');
        assertTraverses(i, '/', '/node_modules/@types/boop');
        i = '*.log\n!important.log\n';
        assertIgnoreMatch(i, '/', '/test.log');
        assertIgnoreMatch(i, '/', '/inner/test.log');
        assertNoIgnoreMatch(i, '/', '/important.log');
        assertNoIgnoreMatch(i, '/', '/inner/important.log');
        assertNoTraverses(i, '/', '/test.log');
        assertNoTraverses(i, '/', '/inner/test.log');
        assertTraverses(i, '/', '/important.log');
        assertTraverses(i, '/', '/inner/important.log');
    });
    test('nested .gitignores', () => {
        let i = 'node_modules\nout\n';
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        i = '/node_modules\n/out\n';
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertNoIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        assertNoIgnoreMatch(i, '/inner/', '/node_modules');
        i = 'node_modules/\nout/\n';
        assertNoIgnoreMatch(i, '/inner/', '/inner/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/node_modules/');
        assertNoIgnoreMatch(i, '/inner/', '/inner/more/node_modules');
        assertIgnoreMatch(i, '/inner/', '/inner/more/node_modules/');
        assertNoIgnoreMatch(i, '/inner/', '/node_modules');
    });
    test('file extension matches', () => {
        let i = '*.js\n';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        i = '/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.js');
        i = '**/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = 'inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '/inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/inner/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/inner/**/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
        i = '**/more/*.js';
        assertNoIgnoreMatch(i, '/', '/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.ts');
        assertNoIgnoreMatch(i, '/', '/inner/myFile.js');
        assertNoIgnoreMatch(i, '/', '/inner/more/myFile.ts');
        assertIgnoreMatch(i, '/', '/inner/more/myFile.js');
    });
    test('real world example: vscode-js-debug', () => {
        const i = `.cache/
			.profile/
			.cdp-profile/
			.headless-profile/
			.vscode-test/
			.DS_Store
			node_modules/
			out/
			dist
			/coverage
			/.nyc_output
			demos/web-worker/vscode-pwa-dap.log
			demos/web-worker/vscode-pwa-cdp.log
			.dynamic-testWorkspace
			**/test/**/*.actual
			/testWorkspace/web/tmp
			/testWorkspace/**/debug.log
			/testWorkspace/webview/win/true/
			*.cpuprofile`;
        const included = [
            '/distro',
            '/inner/coverage',
            '/inner/.nyc_output',
            '/inner/demos/web-worker/vscode-pwa-dap.log',
            '/inner/demos/web-worker/vscode-pwa-cdp.log',
            '/testWorkspace/webview/win/true',
            '/a/best/b/c.actual',
            '/best/b/c.actual',
        ];
        const excluded = [
            '/.profile/',
            '/inner/.profile/',
            '/.DS_Store',
            '/inner/.DS_Store',
            '/coverage',
            '/.nyc_output',
            '/demos/web-worker/vscode-pwa-dap.log',
            '/demos/web-worker/vscode-pwa-cdp.log',
            '/.dynamic-testWorkspace',
            '/inner/.dynamic-testWorkspace',
            '/test/.actual',
            '/test/hello.actual',
            '/a/test/.actual',
            '/a/test/b.actual',
            '/a/test/b/.actual',
            '/a/test/b/c.actual',
            '/a/b/test/.actual',
            '/a/b/test/f/c.actual',
            '/testWorkspace/web/tmp',
            '/testWorkspace/debug.log',
            '/testWorkspace/a/debug.log',
            '/testWorkspace/a/b/debug.log',
            '/testWorkspace/webview/win/true/',
            '/.cpuprofile',
            '/a.cpuprofile',
            '/aa/a.cpuprofile',
            '/aaa/aa/a.cpuprofile',
        ];
        for (const include of included) {
            assertNoIgnoreMatch(i, '/', include);
        }
        for (const exclude of excluded) {
            assertIgnoreMatch(i, '/', exclude);
        }
    });
    test('real world example: vscode', () => {
        const i = `.DS_Store
			.cache
			npm-debug.log
			Thumbs.db
			node_modules/
			.build/
			extensions/**/dist/
			/out*/
			/extensions/**/out/
			src/vs/server
			resources/server
			build/node_modules
			coverage/
			test_data/
			test-results/
			yarn-error.log
			vscode.lsif
			vscode.db
			/.profile-oss`;
        const included = [
            '/inner/extensions/dist',
            '/inner/extensions/boop/dist/test',
            '/inner/extensions/boop/doop/dist',
            '/inner/extensions/boop/doop/dist/test',
            '/inner/extensions/boop/doop/dist/test',
            '/inner/extensions/out/test',
            '/inner/extensions/boop/out',
            '/inner/extensions/boop/out/test',
            '/inner/out/',
            '/inner/out/test',
            '/inner/out1/',
            '/inner/out1/test',
            '/inner/out2/',
            '/inner/out2/test',
            '/inner/.profile-oss',
            // Files.
            '/extensions/dist',
            '/extensions/boop/doop/dist',
            '/extensions/boop/out',
        ];
        const excluded = [
            '/extensions/dist/',
            '/extensions/boop/dist/test',
            '/extensions/boop/doop/dist/',
            '/extensions/boop/doop/dist/test',
            '/extensions/boop/doop/dist/test',
            '/extensions/out/test',
            '/extensions/boop/out/',
            '/extensions/boop/out/test',
            '/out/',
            '/out/test',
            '/out1/',
            '/out1/test',
            '/out2/',
            '/out2/test',
            '/.profile-oss',
        ];
        for (const include of included) {
            assertNoIgnoreMatch(i, '/', include);
        }
        for (const exclude of excluded) {
            assertIgnoreMatch(i, '/', exclude);
        }
    });
    test('various advanced constructs found in popular repos', () => {
        const runTest = ({ pattern, included, excluded, }) => {
            for (const include of included) {
                assertNoIgnoreMatch(pattern, '/', include);
            }
            for (const exclude of excluded) {
                assertIgnoreMatch(pattern, '/', exclude);
            }
        };
        runTest({
            pattern: `**/node_modules
			/packages/*/dist`,
            excluded: [
                '/node_modules',
                '/test/node_modules',
                '/node_modules/test',
                '/test/node_modules/test',
                '/packages/a/dist',
                '/packages/abc/dist',
                '/packages/abc/dist/test',
            ],
            included: [
                '/inner/packages/a/dist',
                '/inner/packages/abc/dist',
                '/inner/packages/abc/dist/test',
                '/packages/dist',
                '/packages/dist/test',
                '/packages/a/b/dist',
                '/packages/a/b/dist/test',
            ],
        });
        runTest({
            pattern: `.yarn/*
			# !.yarn/cache
			!.yarn/patches
			!.yarn/plugins
			!.yarn/releases
			!.yarn/sdks
			!.yarn/versions`,
            excluded: ['/.yarn/test', '/.yarn/cache'],
            included: [
                '/inner/.yarn/test',
                '/inner/.yarn/cache',
                '/.yarn/patches',
                '/.yarn/plugins',
                '/.yarn/releases',
                '/.yarn/sdks',
                '/.yarn/versions',
            ],
        });
        runTest({
            pattern: `[._]*s[a-w][a-z]
			[._]s[a-w][a-z]
			*.un~
			*~`,
            excluded: [
                '/~',
                '/abc~',
                '/inner/~',
                '/inner/abc~',
                '/.un~',
                '/a.un~',
                '/test/.un~',
                '/test/a.un~',
                '/.saa',
                '/....saa',
                '/._._sby',
                '/inner/._._sby',
                '/_swz',
            ],
            included: ['/.jaa'],
        });
        // TODO: the rest of these :)
        runTest({
            pattern: `*.pbxuser
			!default.pbxuser
			*.mode1v3
			!default.mode1v3
			*.mode2v3
			!default.mode2v3
			*.perspectivev3
			!default.perspectivev3`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `[Dd]ebug/
			[Dd]ebugPublic/
			[Rr]elease/
			[Rr]eleases/
			*.[Mm]etrics.xml
			[Tt]est[Rr]esult*/
			[Bb]uild[Ll]og.*
			bld/
			[Bb]in/
			[Oo]bj/
			[Ll]og/`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `Dockerfile*
			!/tests/bud/*/Dockerfile*
			!/tests/conformance/**/Dockerfile*`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `*.pdf
			*.html
			!author_bio.html
			!colo.html
			!copyright.html
			!cover.html
			!ix.html
			!titlepage.html
			!toc.html`,
            excluded: [],
            included: [],
        });
        runTest({
            pattern: `/log/*
			/tmp/*
			!/log/.keep
			!/tmp/.keep`,
            excluded: [],
            included: [],
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWdub3JlRmlsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC90ZXN0L2NvbW1vbi9pZ25vcmVGaWxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUV2RCxTQUFTLFNBQVMsQ0FDakIsS0FBYSxFQUNiLFVBQWtCLEVBQ2xCLGtCQUEwQixFQUMxQixXQUFvQixFQUNwQixRQUFpQjtJQUVqQixPQUFPLENBQUMsTUFBYyxFQUFFLEVBQUU7UUFDekIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUVqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxHQUFHLGtCQUFrQixDQUFDLENBQUE7UUFDdkUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLEdBQUcsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRTdFLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sQ0FDTCxTQUFTLEVBQ1QsR0FBRyxrQkFBa0IsS0FBSyxVQUFVLG9CQUFvQixLQUFLLENBQUMsQ0FBQyxDQUFDLEtB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