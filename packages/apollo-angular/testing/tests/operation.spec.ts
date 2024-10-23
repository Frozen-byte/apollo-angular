import { ApolloLink, execute, FetchResult, gql } from '@apollo/client/core';
import { ApolloTestingBackend } from '../src/backend';
import { buildOperationForLink } from './utils';

const testQuery = gql`
  query allHeroes {
    heroes {
      name
    }
  }
`;
const testSubscription = gql`
  subscription newHeroes {
    heroes {
      name
    }
  }
`;

describe('TestOperation', () => {
  let mock: ApolloTestingBackend;
  let link: ApolloLink;

  beforeEach(() => {
    mock = new ApolloTestingBackend();
    link = new ApolloLink(op =>
      mock.handle({
        ...op,
        clientName: 'default',
      }),
    );
  });

  test('accepts a null body', done => {
    const operation = buildOperationForLink(testQuery, {});

    execute(link, operation).subscribe(result => {
      expect(result).toBeNull();
      done();
    });

    mock.expectOne(testQuery).flush(null!);
  });

  test('should accepts data for flush operation', done => {
    const operation = buildOperationForLink(testQuery, {});

    execute(link, operation).subscribe(result => {
      expect(result).toEqual({
        data: {
          heroes: [],
        },
      });

      done();
    });

    mock.expectOne(testQuery).flushData({
      heroes: [],
    });
  });

  test('should close the operation except for subscription', done => {
    const operation = buildOperationForLink(testSubscription, {});
    const emittedResults: FetchResult[] = [];

    execute(link, operation).subscribe({
      next(result) {
        emittedResults.push(result);
      },
      complete() {
        expect(emittedResults).toEqual([
          {
            data: {
              heroes: ['first Hero'],
            },
          },
          {
            data: {
              heroes: ['second Hero'],
            },
          },
        ]);
        done();
      },
    });

    const testOperation = mock.expectOne(testSubscription);

    testOperation.flushData({
      heroes: ['first Hero'],
    });

    testOperation.flushData({
      heroes: ['second Hero'],
    });
    testOperation.complete();
  });
});
