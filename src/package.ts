import { RequestHandler } from 'express';
import { maxSatisfying } from 'semver';
import got from 'got';
import { NPMPackage } from './types';

type Package = { version: string; dependencies: Record<string, Package> };
let flatDependencyList: any[] = [];

/**
 * Attempts to retrieve package data from the npm registry and return it
 */
export const getPackage: RequestHandler = async function (req, res, next) {
  const { name, version } = req.params;
  const dependencyTree = {};
  flatDependencyList = [];
  // review: Add new line before try block
  try {
    const npmPackage: NPMPackage = await got(
      `https://registry.npmjs.org/${name}`,
    ).json();

    const dependencies: Record<string, string> =
      npmPackage.versions[version].dependencies ?? {};
    // review: Add new line before for loop
    // review: Using for loop combined with await here will cause the requests to be made sequentially.
    // Consider using Promise.all and map to make them concurrently.
    for (const [name, range] of Object.entries(dependencies)) {
      const subDep = await getDependencies(name, range);
      // review: Using Promise.all and map, will retain order,
      // so instead of needing to define the dependencyTree object separately before mutating,
      // you can reduce the array of dependencies to an object immutably (or mutably if performance becomes an issue).
      dependencyTree[name] = subDep;
    }

    return res
      .status(200)
      .json({ name, version, dependencies: dependencyTree });
  } catch (error) {
    return next(error);
  }
};

async function getDependencies(name: string, range: string): Promise<Package> {
  const npmPackage: NPMPackage = await got(
    `https://registry.npmjs.org/${name}`,
  ).json();

  const v = maxSatisfying(Object.keys(npmPackage.versions), range);
  const dependencies: Record<string, Package> = {};

  if (v) {
    const newDeps = npmPackage.versions[v].dependencies;
    // review: As above, could use Promise.all and map to make requests concurrently.
    for (const [name, range] of Object.entries(newDeps ?? {})) {
      const dependencyExists = flatDependencyList.find(
        (depName) => name === depName,
      );

      console.log('🚀 ~ dependencyExists ~ name:', name);

      console.log(
        '🚀 ~ dependencyExists ~ dependencyExists:',
        dependencyExists,
      );

      if (dependencyExists) {
        return dependencies[name];
      }

      const subDependency = await getDependencies(name, range);
      dependencies[name] = subDependency;
      if (subDependency?.dependencies) {
        flatDependencyList = flatDependencyList.concat(
          Object.keys(subDependency.dependencies),
        );
      }
    }
    console.log('🚀 ~ flatDependencyList:', flatDependencyList);
  }

  return { version: v ?? range, dependencies };
}
