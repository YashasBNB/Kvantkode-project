// /*--------------------------------------------------------------------------------------
//  *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
//  *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
//  *--------------------------------------------------------------------------------------*/
import { separateOutFirstLine } from './util.js';
// this works better than model.getLanguageId()
export function detectLanguage(languageService, opts) {
    const firstLine = opts.fileContents ? separateOutFirstLine(opts.fileContents)?.[0] : undefined;
    const fullLang = languageService.createByFilepathOrFirstLine(opts.uri, firstLine);
    return fullLang.languageId || 'plaintext';
}
// --- conversions
export const convertToVscodeLang = (languageService, markdownLang) => {
    if (markdownLang in markdownLangToVscodeLang)
        return markdownLangToVscodeLang[markdownLang];
    const { languageId } = languageService.createById(markdownLang);
    return languageId;
};
// // eg "bash" -> "shell"
const markdownLangToVscodeLang = {
    // Web Technologies
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    javascript: 'typescript',
    js: 'typescript', // use more general renderer
    jsx: 'typescriptreact',
    typescript: 'typescript',
    ts: 'typescript',
    tsx: 'typescriptreact',
    json: 'json',
    jsonc: 'json',
    // Programming Languages
    python: 'python',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    'c++': 'cpp',
    c: 'c',
    csharp: 'csharp',
    cs: 'csharp',
    'c#': 'csharp',
    go: 'go',
    golang: 'go',
    rust: 'rust',
    rs: 'rust',
    ruby: 'ruby',
    rb: 'ruby',
    php: 'php',
    shell: 'shellscript', // this is important
    bash: 'shellscript',
    sh: 'shellscript',
    zsh: 'shellscript',
    // Markup and Config
    markdown: 'markdown',
    md: 'markdown',
    xml: 'xml',
    svg: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    ini: 'ini',
    toml: 'ini',
    // Database and Query Languages
    sql: 'sql',
    mysql: 'sql',
    postgresql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    // Others
    dockerfile: 'dockerfile',
    docker: 'dockerfile',
    makefile: 'makefile',
    plaintext: 'plaintext',
    text: 'plaintext',
};
// // eg ".ts" -> "typescript"
// const fileExtensionToVscodeLanguage: { [key: string]: string } = {
// 	// Web
// 	'html': 'html',
// 	'htm': 'html',
// 	'css': 'css',
// 	'scss': 'scss',
// 	'less': 'less',
// 	'js': 'javascript',
// 	'jsx': 'javascript',
// 	'ts': 'typescript',
// 	'tsx': 'typescript',
// 	'json': 'json',
// 	'jsonc': 'json',
// 	// Programming Languages
// 	'py': 'python',
// 	'java': 'java',
// 	'cpp': 'cpp',
// 	'cc': 'cpp',
// 	'c': 'c',
// 	'h': 'cpp',
// 	'hpp': 'cpp',
// 	'cs': 'csharp',
// 	'go': 'go',
// 	'rs': 'rust',
// 	'rb': 'ruby',
// 	'php': 'php',
// 	'sh': 'shell',
// 	'bash': 'shell',
// 	'zsh': 'shell',
// 	// Markup/Config
// 	'md': 'markdown',
// 	'markdown': 'markdown',
// 	'xml': 'xml',
// 	'svg': 'xml',
// 	'yaml': 'yaml',
// 	'yml': 'yaml',
// 	'ini': 'ini',
// 	'toml': 'ini',
// 	// Other
// 	'sql': 'sql',
// 	'graphql': 'graphql',
// 	'gql': 'graphql',
// 	'dockerfile': 'dockerfile',
// 	'docker': 'dockerfile',
// 	'mk': 'makefile',
// 	// Config Files and Dot Files
// 	'npmrc': 'ini',
// 	'env': 'ini',
// 	'gitignore': 'ignore',
// 	'dockerignore': 'ignore',
// 	'eslintrc': 'json',
// 	'babelrc': 'json',
// 	'prettierrc': 'json',
// 	'stylelintrc': 'json',
// 	'editorconfig': 'ini',
// 	'htaccess': 'apacheconf',
// 	'conf': 'ini',
// 	'config': 'ini',
// 	// Package Files
// 	'package': 'json',
// 	'package-lock': 'json',
// 	'gemfile': 'ruby',
// 	'podfile': 'ruby',
// 	'rakefile': 'ruby',
// 	// Build Systems
// 	'cmake': 'cmake',
// 	'makefile': 'makefile',
// 	'gradle': 'groovy',
// 	// Shell Scripts
// 	'bashrc': 'shell',
// 	'zshrc': 'shell',
// 	'fish': 'shell',
// 	// Version Control
// 	'gitconfig': 'ini',
// 	'hgrc': 'ini',
// 	'svnconfig': 'ini',
// 	// Web Server
// 	'nginx': 'nginx',
// 	// Misc Config
// 	'properties': 'properties',
// 	'cfg': 'ini',
// 	'reg': 'ini'
// };
// export function filenameToVscodeLanguage(filename: string): string | undefined {
// 	const ext = filename.toLowerCase().split('.').pop();
// 	if (!ext) return undefined;
// 	return fileExtensionToVscodeLanguage[ext];
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9rdmFudGtvZGUvY29tbW9uL2hlbHBlcnMvbGFuZ3VhZ2VIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJGQUEyRjtBQUMzRiwrREFBK0Q7QUFDL0QsNEZBQTRGO0FBQzVGLDZGQUE2RjtBQUk3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFFaEQsK0NBQStDO0FBQy9DLE1BQU0sVUFBVSxjQUFjLENBQzdCLGVBQWlDLEVBQ2pDLElBQTJEO0lBRTNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDOUYsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDakYsT0FBTyxRQUFRLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsa0JBQWtCO0FBQ2xCLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsZUFBaUMsRUFBRSxZQUFvQixFQUFFLEVBQUU7SUFDOUYsSUFBSSxZQUFZLElBQUksd0JBQXdCO1FBQUUsT0FBTyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUUzRixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsZUFBZSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMvRCxPQUFPLFVBQVUsQ0FBQTtBQUNsQixDQUFDLENBQUE7QUFFRCwwQkFBMEI7QUFDMUIs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