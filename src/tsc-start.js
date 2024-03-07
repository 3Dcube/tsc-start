#!/usr/bin/env node
const net = require('net')
const childProcess = require('child_process')
const { pipeline } = require('stream')
const path = require('path')

function parseInspectArg(arg) {
    if(arg) {
        let brk = false
        let host = "127.0.0.1"
        let port = 9229
    
        if(arg.startsWith("--inspect-brk")) {
            brk = true
        }
        if(arg.includes("=")) {
            const value = arg.split("=").slice(-1)[0]
            if(value.includes(":")) {
                const [hostStr, portStr] = value.split(":")
                host = hostStr
                port = Number.parseInt(portStr)
            } else {
                port = Number.parseInt(value)
            }
        }
    
        return {
            targetProcessOption: brk ? '--inspect-brk=0' : '--inspect=0',
            brk,
            host,
            port,
        }
    } else {
        return null
    }
}

function spawnTargetProcess(nodeArgs, parsedInspectArg, onInspectURL) {
    const entrypointPath = path.join(__dirname, 'entrypoint')

    const inspectArgs = parsedInspectArg === null ? [] : [parsedInspectArg.targetProcessOption]

    const targetProcess = childProcess.fork(entrypointPath, {
        execArgv: [...nodeArgs, ...inspectArgs],
        silent: true,
    })

    targetProcess.stdout.pipe(process.stdout)

    if(parsedInspectArg !== null) {
        targetProcess.stderr.on('data', (chunk) => {
            const str = chunk.toString()
            if(str.startsWith("Debugger listening on ")) {
                const url = str.split("\n")[0].slice("Debugger listening on ".length)
                onInspectURL(targetProcess, url)
            } else {
                process.stderr.write(chunk)
            }
        })
    } else {
        targetProcess.stderr.pipe(process.stderr)
    }

    targetProcess.on('error', (error) => {
        console.error(error)
    })

    return targetProcess
}

function spawnTypescriptCompiler(typescriptArgs, onCompilationFinish) {
    const tscPath = require.resolve('typescript/bin/tsc')
    const compiler = childProcess.spawn(process.argv0, [tscPath, '--watch', '--locale', 'en', ...typescriptArgs])

    compiler.stdout.pipe(process.stdout)
    compiler.stderr.pipe(process.stderr)
    
    compiler.stdout.on('data', (text) => {
        if(text.includes('Found 0 errors')) {
            onCompilationFinish()
        }
    })
}

function createInspectURLManager(parsedInspectArg) {
    let currentProcess = null
    let inspectURLMap = new Map()

    let inspectURLWaiters = []
    
    const fulfillUrlWaiters = (url) => {
        inspectURLWaiters.forEach((waiter) => {
            waiter(url)
        })
        inspectURLWaiters = []
    }

    return {
        setCurrentProcess(targetProcessWrapper) {
            currentProcess = targetProcessWrapper
            if(inspectURLMap.has(currentProcess)) {
               fulfillUrlWaiters(inspectURLMap.get(currentProcess))

                const parsedURL = new URL(inspectURLMap.get(currentProcess))
                process.stderr.write(`Debugger listening on ws://${parsedInspectArg.host || "127.0.0.1"}:${parsedInspectArg.port}${parsedURL.pathname}\n` +
                    'For help, see: https://nodejs.org/en/docs/inspector\n')
            }
            console.log(Array.from(inspectURLMap.values()))
        },
        waitForInspectURL() {
            if(inspectURLMap.has(currentProcess)) {
                return Promise.resolve(inspectURLMap.get(currentProcess))
            } else {
                return new Promise((resolve) => {
                    inspectURLWaiters.push(resolve)
                })
            }
        },
        inspectURLResolver(targetProcess, url) {
            inspectURLMap.set(targetProcess, url)
            targetProcess.on('exit', () => {
                inspectURLMap.delete(targetProcess)
            })
            if(targetProcess === currentProcess) {
               fulfillUrlWaiters(url)
            }
        }
    }
}

async function main() {
    const args = process.argv.slice(2)
    
    const splitterIndex = args.indexOf("--")
    
    const typescriptArgs = splitterIndex === -1 ? [] : args.slice(0, splitterIndex)
    const nodeArgsAll = splitterIndex === -1 ? [] : args.slice(splitterIndex + 1, -1)
    
    const parsedInspectArg = parseInspectArg(nodeArgsAll.find((arg) => arg.startsWith('--inspect')))

    const nodeArgs = nodeArgsAll.filter((arg) => !arg.startsWith('--inspect'))

    const targetPath = path.join(process.cwd(), args.slice(-1)[0])
    
    let currentProcess = null

    const inspectURLMaanger = createInspectURLManager(parsedInspectArg)
    let nextProcess = spawnTargetProcess(nodeArgs, parsedInspectArg, inspectURLMaanger.inspectURLResolver)


    if(parsedInspectArg !== null) {
        const inspectProxyServer = net.createServer((socket) => {
            inspectURLMaanger.waitForInspectURL().then((inspectURL) => {
                const parsedInspectURL = new URL(inspectURL)
                const proxyConnection = net.createConnection({
                    host: parsedInspectURL.hostname,
                    port: parsedInspectURL.port,
                }, () => {
                    pipeline(socket, proxyConnection, () => {})
                    pipeline(proxyConnection, socket, () => {})
                })

                proxyConnection.on('error', () => {})
            })
        })

        inspectProxyServer.listen(parsedInspectArg.port, parsedInspectArg.host)
    }

    spawnTypescriptCompiler(typescriptArgs, () => {spawnTypescriptCompiler
        if(currentProcess) {
            currentProcess.kill()
        }
        currentProcess = nextProcess
        inspectURLMaanger.setCurrentProcess(currentProcess)
        currentProcess.send({ target: targetPath })
        nextProcess = spawnTargetProcess(nodeArgs, parsedInspectArg, inspectURLMaanger.inspectURLResolver)
    })
}


main()
    .catch(console.error)

