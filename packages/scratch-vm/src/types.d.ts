// webpack's `asset` rule resolves image imports to their URL
declare module '*.svg' {
    const url: string;
    export default url;
}
