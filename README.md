# tsc-start

Wrapper around `tsc --watch`, when it sees `Found 0 errors` in the stdout it starts the target. It also preloads dependencies to speedup a start, but yes, it will not work in some cases, which I'm NOT going to fix. 

This package also expects that typescript already installed and there is `tsconfig.json` in the root of your project.

Example:

```bash
tsc-start dist/main.js
```

## Install globally

```bash
yarn global add tsc-start
# or
npm i -g tsc-start
```

## Or install locally in the project

```bash
yarn add -D tsc-start
# or
npm i --save-dev tsc-start
```

Then you can add `scripts` entry like so
```json
{
    "scripts": {
        "dev": "tsc-start dist/main.js"
    }
}
```

And run it accordingly

```bash
yarn run dev
# or
npm run dev
```

## Example with Yarn

```bash
mkdir example
cd example
yarn init -y
yarn add -D typescript tsc-start
```

`tsconfig.json`
```json
{
    "compilerOptions": {
        "module": "CommonJS",
        "outDir": "./dist"
    },
    "include": [
        "src/**/*"
    ]
}
```

`src/main.ts`
```typescript
console.log('hello world')
```

You can run code like this:
```bash
yarn run tsc-start dist/main.js
```
