import path from "path"
import fs from "fs"
import { jsoncParse } from "./utils"

const resolveTsConfig = (cwd: string, name: string) => {
  if (path.isAbsolute(name)) return name
  if (name.startsWith(".")) return path.join(cwd, name)
  const id = require.resolve(name, { paths: [cwd] })
  return id
}

export type Loaded = {
  /** Path to the nearest config file */
  path: string
  /** Merged config data */
  data: any
  /** Discovered config files */
  files: string[]
}

export const loadTsConfig = (
  dir = process.cwd(),
  /**
   * name should be an absolute path, a relative path, or a package
   * @example './tsconfig.json'
   * @example '/path/to/tsconfig.json'
   * @example '@scope/tsconfig'
   * @example 'my-tsconfig'
   */
  name = "./tsconfig.json",
  /** @private */
  __files: string[] = [],
): Loaded | null => {
  const id = resolveTsConfig(path.resolve(dir), name)
  if (!id) return null

  const data = jsoncParse(fs.readFileSync(id, "utf-8"))
  __files.unshift(id)
  const configDir = path.dirname(id)
  if (data.compilerOptions?.baseUrl) {
    data.compilerOptions.baseUrl = path.join(
      configDir,
      data.compilerOptions.baseUrl,
    )
  }
  if (data.extends) {
    const parentConfig = loadTsConfig(configDir, data.extends, __files)
    if (parentConfig) {
      Object.assign(data, {
        ...parentConfig.data,
        ...data,
        compilerOptions: {
          ...parentConfig.data.compilerOptions,
          ...data.compilerOptions,
        },
      })
    }
  }
  delete data.extends
  return { path: id, data, files: __files }
}