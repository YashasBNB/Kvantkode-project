/*
Installs Python dependencies for the trading project into a dedicated venv.

Behavior:
- PY_TRADING_PATH env var can specify the python project path. Defaults to ../python.
- Creates venv at .python-env under repo root if missing.
- Installs in editable mode if setup/pyproject exists; otherwise uses requirements.txt if present.
- Records last install/update timestamp.
- If UPDATE_IF_OLD=1, only updates when older than 7 days.
*/

const cp = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.dirname(__dirname) // .../void
const venvDir = path.join(root, '.python-env')
const stampFile = path.join(venvDir, 'last_install.json')
const DEFAULT_PY_PATH = path.resolve(root, '..', 'python')
const PY_PATH = process.env.PY_TRADING_PATH
	? path.resolve(process.env.PY_TRADING_PATH)
	: DEFAULT_PY_PATH
const UPDATE_IF_OLD = process.env.UPDATE_IF_OLD === '1'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function log(...args) {
	console.log('[python-install]', ...args)
}

function run(cmd, args, opts = {}) {
	log('$', cmd, args.join(' '))
	const res = cp.spawnSync(cmd, args, { stdio: 'inherit', ...opts })
	if (res.error) throw res.error
	if (res.status !== 0) throw new Error(`${cmd} exited with ${res.status}`)
}

function pickPython() {
	// Prefer python3 on mac/linux
	const candidates =
		process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python']
	for (const c of candidates) {
		try {
			const res = cp.spawnSync(c, ['--version'], { stdio: 'ignore' })
			if (res.status === 0) return c
		} catch {}
	}
	throw new Error('No Python interpreter found (tried python3, python, py)')
}

function readStamp() {
	try {
		const j = JSON.parse(fs.readFileSync(stampFile, 'utf8'))
		return j
	} catch {
		return null
	}
}

function writeStamp(extra = {}) {
	fs.mkdirSync(venvDir, { recursive: true })
	fs.writeFileSync(
		stampFile,
		JSON.stringify({ ts: Date.now(), pyPath: PY_PATH, ...extra }, null, 2),
		'utf8',
	)
}

function detectProjectType(pyPath) {
	const hasReq = fs.existsSync(path.join(pyPath, 'requirements.txt'))
	const hasPyProject = fs.existsSync(path.join(pyPath, 'pyproject.toml'))
	const hasSetup = fs.existsSync(path.join(pyPath, 'setup.py'))
	return { hasReq, hasPyProject, hasSetup }
}

;(function main() {
	if (!fs.existsSync(PY_PATH)) {
		log(
			'Python project not found at',
			PY_PATH,
			'- skipping install. Set PY_TRADING_PATH to override.',
		)
		return
	}

	if (UPDATE_IF_OLD) {
		const stamp = readStamp()
		if (stamp && Date.now() - (stamp.ts || 0) < SEVEN_DAYS_MS) {
			log('Last install/update is recent; skipping due to UPDATE_IF_OLD=1')
			return
		}
	}

	const py = pickPython()
	const venvPython =
		process.platform === 'win32'
			? path.join(venvDir, 'Scripts', 'python.exe')
			: path.join(venvDir, 'bin', 'python')

	if (!fs.existsSync(venvPython)) {
		log('Creating virtual environment at', venvDir)
		fs.mkdirSync(venvDir, { recursive: true })
		// Prefer venv; fall back to ensurepip if needed
		run(py, ['-m', 'venv', venvDir])
	} else {
		log('Using existing virtual environment at', venvDir)
	}

	// Upgrade pip
	run(venvPython, ['-m', 'pip', 'install', '--upgrade', 'pip', 'setuptools', 'wheel'])

	const { hasReq, hasPyProject, hasSetup } = detectProjectType(PY_PATH)

	if (hasReq) {
		log('Installing requirements.txt')
		run(venvPython, ['-m', 'pip', 'install', '-r', path.join(PY_PATH, 'requirements.txt')])
	}

	if (hasPyProject || hasSetup) {
		// Prefer editable install for development
		log('Installing project in editable mode')
		run(venvPython, ['-m', 'pip', 'install', '-e', PY_PATH])
	} else if (!hasReq) {
		// As a fallback, try to install the directory (may fail if not a package)
		log('No pyproject/setup.py/requirements.txt; attempting direct install')
		try {
			run(venvPython, ['-m', 'pip', 'install', PY_PATH])
		} catch (e) {
			log('Direct install failed; leaving venv with base packages only.')
		}
	}

	writeStamp()
	log('Python dependencies installed/updated for', PY_PATH)
})()
