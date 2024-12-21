import got from 'got';
import { Server } from 'http';
import { createApp } from '../src/app';

describe('/package/:name/:version endpoint', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    // review: Consider using mocks to avoid making actual requests in tests.
    // Making actual requests can be slow and unreliable.
    server = await new Promise((resolve, reject) => {
      const server = createApp().listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          port = addr.port;
          resolve(server);
        } else {
          reject(new Error('Unexpected address ${addr} for server'));
        }
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('responds', async () => {
    const packageName = 'react';
    const packageVersion = '16.13.0';

    /**
     * review: We seem to be testing a lot of things unintentionally here.
     * If we want to test that our code works, we should be mocking the requests and responses
     * and testing the logic in isolation.
     * Furthermore it would be better to split tests in to unit and integration tests.
     * This will also give us more control over what we are testing at different stages of our CI pipeline.
     *  */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await got(
      `http://localhost:${port}/package/${packageName}/${packageVersion}`,
    );
    const json = JSON.parse(res.body);

    expect(res.statusCode).toEqual(200);
    expect(json.name).toEqual(packageName);
    expect(json.version).toEqual(packageVersion);
    // review: This test is failing because it doesn't take in to account automatic compatible version updates
    // using `^` and other version matchers.
    // Also Consider using snapshot testing to test the entire response object.
    expect(json.dependencies).toEqual({
      'loose-envify': {
        version: '1.4.0',
        dependencies: {
          'js-tokens': {
            version: '4.0.0',
            dependencies: {},
          },
        },
      },
      'object-assign': {
        version: '4.1.1',
        dependencies: {},
      },
      'prop-types': {
        version: '15.8.1',
        dependencies: {
          'object-assign': {
            version: '4.1.1',
            dependencies: {},
          },
          'loose-envify': {
            version: '1.4.0',
            dependencies: {
              'js-tokens': {
                version: '4.0.0',
                dependencies: {},
              },
            },
          },
          'react-is': {
            version: '16.13.1',
            dependencies: {},
          },
        },
      },
    });
  });

  /**
   * review: Consider adding more tests to cover edge cases and error handling.
   * I would also consider making more granular tests, like this:
   * - Single dependency with no dependencies
   * - Single dependency with dependencies
   * - Multiple dependencies with no dependencies
   * - Multiple dependencies with dependencies
   * This will make it easier to pinpoint where the code is failing.
   */
});
