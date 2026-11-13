import postcssImport from 'postcss-import'
import postcssSimpleVars from 'postcss-simple-vars'

// thingblock-ui styles import `$variable` tokens from its css/ folder
export default {
  plugins: [postcssImport(), postcssSimpleVars()],
}
