/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PreTrie, ExplorerFileNestingTrie, SufTrie } from '../../common/explorerFileNestingTrie.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const fakeFilenameAttributes = { dirname: 'mydir', basename: '', extname: '' };
suite('SufTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new SufTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new SufTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.cd.js',
            'Key3.a.b.c.js',
        ]);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.c.d.js',
            'Key3.a.b.c..js',
        ]);
    });
});
suite('PreTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('exactMatches', () => {
        const t = new PreTrie();
        t.add('.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), []);
    });
    test('starMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'MyKey');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['MyKey']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['MyKey']);
    });
    test('starSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', '${capture}.json');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['.json']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['a.json']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['a.b.c.d.json']);
    });
    test('multiMatches', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1');
        t.add('*.json', 'Key2');
        t.add('*d.npmrc', 'Key3');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1']);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), ['Key1', 'Key3']);
    });
    test('multiSubstitutes', () => {
        const t = new PreTrie();
        t.add('*.npmrc', 'Key1.${capture}.js');
        t.add('*.json', 'Key2.${capture}.js');
        t.add('*d.npmrc', 'Key3.${capture}.js');
        assert.deepStrictEqual(t.get('.npmrc', fakeFilenameAttributes), ['Key1..js']);
        assert.deepStrictEqual(t.get('npmrc', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.npmrcs', fakeFilenameAttributes), []);
        assert.deepStrictEqual(t.get('.json', fakeFilenameAttributes), ['Key2..js']);
        assert.deepStrictEqual(t.get('a.json', fakeFilenameAttributes), ['Key2.a.js']);
        assert.deepStrictEqual(t.get('a.npmrc', fakeFilenameAttributes), ['Key1.a.js']);
        assert.deepStrictEqual(t.get('a.b.cd.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.cd.js',
            'Key3.a.b.c.js',
        ]);
        assert.deepStrictEqual(t.get('a.b.c.d.npmrc', fakeFilenameAttributes), [
            'Key1.a.b.c.d.js',
            'Key3.a.b.c..js',
        ]);
    });
    test('emptyMatches', () => {
        const t = new PreTrie();
        t.add('package*json', 'package');
        assert.deepStrictEqual(t.get('package.json', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('packagejson', fakeFilenameAttributes), ['package']);
        assert.deepStrictEqual(t.get('package-lock.json', fakeFilenameAttributes), ['package']);
    });
});
suite('StarTrie', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const assertMapEquals = (actual, expected) => {
        const actualStr = [...actual.entries()].map((e) => `${e[0]} => [${[...e[1].keys()].join()}]`);
        const expectedStr = Object.entries(expected).map((e) => `${e[0]}: [${[e[1]].join()}]`);
        const bigMsg = actualStr + '===' + expectedStr;
        assert.strictEqual(actual.size, Object.keys(expected).length, bigMsg);
        for (const parent of actual.keys()) {
            const act = actual.get(parent);
            const exp = expected[parent];
            const str = [...act.keys()].join() + '===' + exp.join();
            const msg = bigMsg + '\n' + str;
            assert(act.size === exp.length, msg);
            for (const child of exp) {
                assert(act.has(child), msg);
            }
        }
    };
    test('does added extension nesting', () => {
        const t = new ExplorerFileNestingTrie([['*', ['${capture}.*']]]);
        const nesting = t.nest([
            'file',
            'file.json',
            'boop.test',
            'boop.test1',
            'boop.test.1',
            'beep',
            'beep.test1',
            'beep.boop.test1',
            'beep.boop.test2',
            'beep.boop.a',
        ], 'mydir');
        assertMapEquals(nesting, {
            file: ['file.json'],
            'boop.test': ['boop.test.1'],
            'boop.test1': [],
            beep: ['beep.test1', 'beep.boop.test1', 'beep.boop.test2', 'beep.boop.a'],
        });
    });
    test('does ext specific nesting', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.ts', ['${capture}.js']],
            ['*.js', ['${capture}.map']],
        ]);
        const nesting = t.nest(['a.ts', 'a.js', 'a.jss', 'ab.js', 'b.js', 'b.map', 'c.ts', 'c.js', 'c.map', 'd.ts', 'd.map'], 'mydir');
        assertMapEquals(nesting, {
            'a.ts': ['a.js'],
            'ab.js': [],
            'a.jss': [],
            'b.js': ['b.map'],
            'c.ts': ['c.js', 'c.map'],
            'd.ts': [],
            'd.map': [],
        });
    });
    test('handles loops', () => {
        const t = new ExplorerFileNestingTrie([
            ['*.a', ['${capture}.b', '${capture}.c']],
            ['*.b', ['${capture}.a']],
            ['*.c', ['${capture}.d']],
            ['*.aa', ['${capture}.bb']],
            ['*.bb', ['${capture}.cc', '${capture}.dd']],
            ['*.cc', ['${capture}.aa']],
            ['*.dd', ['${capture}.ee']],
        ]);
        const nesting = t.nest([
            '.a',
            '.b',
            '.c',
            '.d',
            'a.a',
            'a.b',
            'a.d',
            'a.aa',
            'a.bb',
            'a.cc',
            'b.aa',
            'b.bb',
            'c.bb',
            'c.cc',
            'd.aa',
            'd.cc',
            'e.aa',
            'e.bb',
            'e.dd',
            'e.ee',
            'f.aa',
            'f.bb',
            'f.cc',
            'f.dd',
            'f.ee',
        ], 'mydir');
        assertMapEquals(nesting, {
            '.a': [],
            '.b': [],
            '.c': [],
            '.d': [],
            'a.a': [],
            'a.b': [],
            'a.d': [],
            'a.aa': [],
            'a.bb': [],
            'a.cc': [],
            'b.aa': ['b.bb'],
            'c.bb': ['c.cc'],
            'd.cc': ['d.aa'],
            'e.aa': ['e.bb', 'e.dd', 'e.ee'],
            'f.aa': [],
            'f.bb': [],
            'f.cc': [],
            'f.dd': [],
            'f.ee': [],
        });
    });
    test('does general bidirectional suffix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.js', ['${capture}-vscdoc.js']],
        ]);
        const nesting = t.nest(['a-vsdoc.js', 'a.js', 'b.js', 'b-vscdoc.js'], 'mydir');
        assertMapEquals(nesting, {
            'a-vsdoc.js': ['a.js'],
            'b.js': ['b-vscdoc.js'],
        });
    });
    test('does general bidirectional prefix matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['vsdoc-*.js', ['${capture}.js']],
            ['*.js', ['vscdoc-${capture}.js']],
        ]);
        const nesting = t.nest(['vsdoc-a.js', 'a.js', 'b.js', 'vscdoc-b.js'], 'mydir');
        assertMapEquals(nesting, {
            'vsdoc-a.js': ['a.js'],
            'b.js': ['vscdoc-b.js'],
        });
    });
    test('does general bidirectional general matching', () => {
        const t = new ExplorerFileNestingTrie([
            ['foo-*-bar.js', ['${capture}.js']],
            ['*.js', ['bib-${capture}-bap.js']],
        ]);
        const nesting = t.nest(['foo-a-bar.js', 'a.js', 'b.js', 'bib-b-bap.js'], 'mydir');
        assertMapEquals(nesting, {
            'foo-a-bar.js': ['a.js'],
            'b.js': ['bib-b-bap.js'],
        });
    });
    test('does extension specific path segment matching', () => {
        const t = new ExplorerFileNestingTrie([['*.js', ['${capture}.*.js']]]);
        const nesting = t.nest(['foo.js', 'foo.test.js', 'fooTest.js', 'bar.js.js'], 'mydir');
        assertMapEquals(nesting, {
            'foo.js': ['foo.test.js'],
            'fooTest.js': [],
            'bar.js.js': [],
        });
    });
    test('does exact match nesting', () => {
        const t = new ExplorerFileNestingTrie([
            [
                'package.json',
                [
                    '.npmrc',
                    'npm-shrinkwrap.json',
                    'yarn.lock',
                    '.yarnclean',
                    '.yarnignore',
                    '.yarn-integrity',
                    '.yarnrc',
                ],
            ],
            ['bower.json', ['.bowerrc']],
        ]);
        const nesting = t.nest(['package.json', '.npmrc', 'npm-shrinkwrap.json', 'yarn.lock', '.bowerrc'], 'mydir');
        assertMapEquals(nesting, {
            'package.json': ['.npmrc', 'npm-shrinkwrap.json', 'yarn.lock'],
            '.bowerrc': [],
        });
    });
    test('eslint test', () => {
        const t = new ExplorerFileNestingTrie([['.eslintrc*', ['.eslint*']]]);
        const nesting1 = t.nest(['.eslintrc.json', '.eslintignore'], 'mydir');
        assertMapEquals(nesting1, {
            '.eslintrc.json': ['.eslintignore'],
        });
        const nesting2 = t.nest(['.eslintrc', '.eslintignore'], 'mydir');
        assertMapEquals(nesting2, {
            '.eslintrc': ['.eslintignore'],
        });
    });
    test('basename expansion', () => {
        const t = new ExplorerFileNestingTrie([['*-vsdoc.js', ['${basename}.doc']]]);
        const nesting1 = t.nest(['boop-vsdoc.js', 'boop-vsdoc.doc', 'boop.doc'], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['boop-vsdoc.doc'],
            'boop.doc': [],
        });
    });
    test('extname expansion', () => {
        const t = new ExplorerFileNestingTrie([['*-vsdoc.js', ['${extname}.doc']]]);
        const nesting1 = t.nest(['boop-vsdoc.js', 'js.doc', 'boop.doc'], 'mydir');
        assertMapEquals(nesting1, {
            'boop-vsdoc.js': ['js.doc'],
            'boop.doc': [],
        });
    });
    test('added segment matcher', () => {
        const t = new ExplorerFileNestingTrie([['*', ['${basename}.*.${extname}']]]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('added segment matcher (old format)', () => {
        const t = new ExplorerFileNestingTrie([['*', ['$(basename).*.$(extname)']]]);
        const nesting1 = t.nest([
            'some.file',
            'some.html.file',
            'some.html.nested.file',
            'other.file',
            'some.thing',
            'some.thing.else',
        ], 'mydir');
        assertMapEquals(nesting1, {
            'some.file': ['some.html.file', 'some.html.nested.file'],
            'other.file': [],
            'some.thing': [],
            'some.thing.else': [],
        });
    });
    test('dirname matching', () => {
        const t = new ExplorerFileNestingTrie([['index.ts', ['${dirname}.ts']]]);
        const nesting1 = t.nest(['otherFile.ts', 'MyComponent.ts', 'index.ts'], 'MyComponent');
        assertMapEquals(nesting1, {
            'index.ts': ['MyComponent.ts'],
            'otherFile.ts': [],
        });
    });
    test.skip('is fast', () => {
        const bigNester = new ExplorerFileNestingTrie([
            ['*', ['${capture}.*']],
            ['*.js', ['${capture}.*.js', '${capture}.map']],
            ['*.jsx', ['${capture}.js']],
            ['*.ts', ['${capture}.js', '${capture}.*.ts']],
            ['*.tsx', ['${capture}.js']],
            ['*.css', ['${capture}.*.css', '${capture}.map']],
            ['*.html', ['${capture}.*.html']],
            ['*.htm', ['${capture}.*.htm']],
            ['*.less', ['${capture}.*.less', '${capture}.css']],
            ['*.scss', ['${capture}.*.scss', '${capture}.css']],
            ['*.sass', ['${capture}.css']],
            ['*.styl', ['${capture}.css']],
            ['*.coffee', ['${capture}.*.coffee', '${capture}.js']],
            ['*.iced', ['${capture}.*.iced', '${capture}.js']],
            ['*.config', ['${capture}.*.config']],
            ['*.cs', ['${capture}.*.cs', '${capture}.cs.d.ts']],
            ['*.vb', ['${capture}.*.vb']],
            ['*.json', ['${capture}.*.json']],
            ['*.md', ['${capture}.html']],
            ['*.mdown', ['${capture}.html']],
            ['*.markdown', ['${capture}.html']],
            ['*.mdwn', ['${capture}.html']],
            ['*.svg', ['${capture}.svgz']],
            ['*.a', ['${capture}.b']],
            ['*.b', ['${capture}.a']],
            ['*.resx', ['${capture}.designer.cs']],
            [
                'package.json',
                [
                    '.npmrc',
                    'npm-shrinkwrap.json',
                    'yarn.lock',
                    '.yarnclean',
                    '.yarnignore',
                    '.yarn-integrity',
                    '.yarnrc',
                ],
            ],
            ['bower.json', ['.bowerrc']],
            ['*-vsdoc.js', ['${capture}.js']],
            ['*.tt', ['${capture}.*']],
        ]);
        const bigFiles = Array.from({ length: 50000 / 6 })
            .map((_, i) => [
            'file' + i + '.js',
            'file' + i + '.map',
            'file' + i + '.css',
            'file' + i + '.ts',
            'file' + i + '.d.ts',
            'file' + i + '.jsx',
        ])
            .flat();
        const start = performance.now();
        // const _bigResult =
        bigNester.nest(bigFiles, 'mydir');
        const end = performance.now();
        assert(end - start < 1000, 'too slow...' + (end - start));
        // console.log(bigResult)
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJGaWxlTmVzdGluZ1RyaWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2V4cGxvcmVyRmlsZU5lc3RpbmdUcmllLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsTUFBTSxzQkFBc0IsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7QUFFOUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFT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