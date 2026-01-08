// Runs the python installer only if the last install is older than 7 days.
const cp = require('child_process')
const path = require('path')

const root = path.dirname(__dirname)
const installer = path.join(root, 'scripts', 'install-python-deps.js')

const res = cp.spawnSync(process.execPath, [installer], {
	stdio: 'inherit',
	env: { ...process.env, UPDATE_IF_OLD: '1' },
})
process.exit(res.status || 0)
