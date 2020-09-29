import * as path from 'path'
import * as fs from 'fs'

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
    const manifest = await fs.promises.readFile(manifestPath)

    const dependencies = Object.keys(manifest['dependencies'] || {})

    for(const dependency of dependencies) {
        require(dependency)
    }
    
    process.on('message', ({ target }) => {
        require(target)
    });
      
}

main()
