#!/usr/bin/env node
const childProcess = require('child_process')
const path = require('path')


const tscPath = require.resolve('typescript/bin/tsc')

const compiler = childProcess.spawn(process.argv0, [tscPath, '--watch', '--locale', 'en', ...process.argv.slice(2, -1)])

const entrypointPath = path.join(__dirname, 'entrypoint')

const targetPath = path.join(process.cwd(), process.argv.slice(-1)[0])

let currentProcess = null
let nextProcess = childProcess.fork(entrypointPath)

nextProcess.on('error', (error) => {
    console.error(error)
})

compiler.stdout.pipe(process.stdout)
compiler.stderr.pipe(process.stderr)

compiler.stdout.on('data', (text) => {
    if(text.includes('Found 0 errors')) {
        if(currentProcess) {
            currentProcess.kill()
        }
        currentProcess = nextProcess
        currentProcess.send({ target: targetPath })
        nextProcess = childProcess.fork(entrypointPath)
        nextProcess.on('error', (error) => {
            console.error(error)
        })
    }
})
