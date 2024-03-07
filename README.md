# tsc-start

Wrapper around `tsc --watch`, when it sees `Found 0 errors` in the stdout it starts the target. It also preloads dependencies to speedup a start, but yes, it will not work in some cases, which I'm NOT going to fix. 

This package also expects that typescript already installed and there is `tsconfig.json` in the root of your project.

## Install

```bash
npm install --save-dev typescript @types/node source-map-support tsc-start
```

Then you can add `scripts` entries
```json
{
    "scripts": {
        "dev": "tsc-start build/main.js",
        "inspect": "tsc-start -- --inspect build/main.js"
    }
}
```

Don't forget about `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "CommonJS",
        "sourceMap": true,
        "outDir": "./build"
    },
    "include": [
        "src/**/*"
    ]
}
```

And run it

```bash
npm run dev
```

## One-liner Example

```bash
mkdir tsc-start-example && cd tsc-start-example && mkdir src && printf '{\n  "scripts": {\n    "dev": "tsc-start build/main.js",\n    "inspect": "tsc-start -- --inspect build/main.js"\n  }\n}\n' > ./package.json && npm install --save-dev typescript @types/node source-map-support tsc-start && printf '{\n    "compilerOptions": {\n        "target": "ES2020",\n        "module": "CommonJS",\n        "sourceMap": true,\n        "outDir": "./build"\n    },\n    "include": [\n        "src/**/*"\n    ]\n}\n' > ./tsconfig.json && printf 'console.log('"'"'hello world'"'"')\n' > ./src/main.ts && npm run dev
```

Then you can change `src/main.ts` and see the result
