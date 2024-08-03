Minor features

### Build Note
`cd` into the Reorder Omega directory first if not already there and run `npx tsc reorder.user.ts` to generate/overwrite the `user.js` file. This will ignore the `tsconfig.json` in the project root; the root config has `noEmit: true` so if you try to use it then you will get no output. As a result, the `user.js` is actually being compiled to es5, not es2015/es6.
