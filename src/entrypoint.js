const path = require('path')
const fs = require('fs')
const url = require('url')

function findManifestPath() {
    let currentDirPath = process.cwd()
    if(fs.existsSync(path.join(currentDirPath, 'package.json'))) {
        return path.join(currentDirPath, 'package.json')
    } else {
        const parentDir = path.join(currentDirPath, '..')
        if(parentDir === currentDirPath) {
            throw new Error("Can't find package.json")
        }
    }
}

async function main() {
    const manifestPath = findManifestPath()
    const manifestBuffer = await fs.promises.readFile(manifestPath)
    const manifest = JSON.parse(manifestBuffer.toString())

    const useImport = manifest['type'] === "module"
    const dependencies = manifest['dependencies'] || {}
    const devDependencies = manifest['devDependencies'] || {}

    if(dependencies['source-map-support'] || devDependencies['source-map-support']) {
        try {
            const dependencyPath = require.resolve('source-map-support/register', {
                paths: [process.cwd()]
            })
            require(dependencyPath)
        } catch (err) {
            console.log(err)
        }
    }


    for(const dependencyName in dependencies) {
        try {
            const dependencyPath = require.resolve(dependencyName, {
                paths: [process.cwd()]
            })
            require(dependencyPath)
        } catch (err) {
        }
    }

    process.on('message', async ({ target }) => {
        const fileURL = url.pathToFileURL(target)
        try {
            if(useImport) {
                await import(fileURL.href)
            } else {
                require(target)
            }
        } catch (err) {
            if(err['code'] === 'ERR_REQUIRE_ESM') {
                await import(fileURL.href)
            } else {
                throw err
            }
        }
    });
      
}

main()
